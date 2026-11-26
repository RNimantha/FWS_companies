/**
 * FWC estimate requests -> Google Sheets.
 * Paste into Apps Script. Set Script Properties as described in README.md.
 * Invoke setupSheet once, then deploy as a web app executing as the owner.
 * Requests must come through the website backend, not directly from the browser.
 */
var FWC_HEADERS = [
  'Submitted At', 'Full Name', 'Phone', 'Email',
  'Service Code', 'Service Required', 'ZIP Code', 'Message', 'Status',
  'Preferred Contact', 'Property Type'
];
var FWC_RECEIPT_HEADERS = ['Request ID', 'Payload Hash', 'Lead Row', 'State'];
var FWC_SERVICES = {
  plumbing: 'Plumbing', electrical: 'Electrical', hvac: 'Heating & cooling',
  sewer: 'Drain & sewer repair', trenchless: 'Trenchless pipe repair',
  drains: 'Drain cleaning', emergency: '24/7 emergency response', unsure: 'Not sure yet'
};

function doGet() {
  // A health response only. Never expose sheet rows or configuration.
  return fwcJson_({ accepted: false, code: 'POST_REQUIRED' });
}

function doPost(e) {
  var lock;
  var locked = false;
  try {
    var settings = fwcSettings_();
    if (!e || !e.postData || e.postData.type.split(';')[0] !== 'application/json' ||
        !e.postData.contents || e.postData.contents.length > 8192) {
      return fwcJson_({ accepted: false, code: 'INVALID_REQUEST' });
    }
    var body;
    try { body = JSON.parse(e.postData.contents); }
    catch (ignored) { return fwcJson_({ accepted: false, code: 'INVALID_REQUEST' }); }
    if (!body || typeof body !== 'object' || body.secret !== settings.secret) {
      return fwcJson_({ accepted: false, code: 'UNAUTHORIZED' });
    }
    var lead = fwcValidate_(body);
    if (!lead) return fwcJson_({ accepted: false, code: 'VALIDATION_FAILED' });

    lock = LockService.getScriptLock();
    locked = lock.tryLock(5000);
    if (!locked) return fwcJson_({ accepted: false, code: 'BUSY' });

    var sheet = fwcSheet_(settings);
    var receipts = fwcReceiptSheet_(settings);
    var hash = fwcHash_(lead);
    var receiptRow = 0;
    var row = 0;
    var lastReceipt = receipts.getLastRow();
    if (lastReceipt > 1) {
      var previous = receipts.getRange(2, 1, lastReceipt - 1, 1)
        .createTextFinder(lead.requestId).matchEntireCell(true).useRegularExpression(false).findNext();
      if (previous) {
        receiptRow = previous.getRow();
        var receipt = receipts.getRange(receiptRow, 1, 1, 4).getValues()[0];
        var storedHash = receipt[1];
        row = Number(receipt[2]);
        if (!Number.isInteger(row) || row < 2) throw new Error("Invalid receipt row");
        var compatibility = 'Preferred contact: ' + lead.preferredContact + '\nProperty type: ' + lead.propertyType;
        var metadataMatches = lead.message === compatibility || lead.message.slice(-(compatibility.length + 1)) === '\n' + compatibility;
        // Before this receiver was updated, the server preserved the new values in Message.
        // Accept that same six-field receipt only when its metadata agrees with the new fields.
        if (storedHash !== hash && !(metadataMatches && storedHash === fwcLegacyHash_(lead))) {
          return fwcJson_({ accepted: false, code: 'IDEMPOTENCY_CONFLICT' });
        }
        if (receipt[3] === 'Saved') return fwcJson_({ accepted: true, requestId: lead.requestId, duplicate: true });
        if (receipt[3] !== 'Pending') throw new Error('Invalid receipt state');
      }
    }
    // A durable global cap. Per-client limits belong in the website backend.
    if (!receiptRow) {
      if (!fwcAllowWrite_()) return fwcJson_({ accepted: false, code: 'RATE_LIMITED' });
      row = sheet.getLastRow() + 1;
      // Pending reservations own their row even if the visible write was interrupted.
      if (lastReceipt > 1) receipts.getRange(2, 3, lastReceipt - 1, 1).getValues().forEach(function (value) {
        row = Math.max(row, Number(value[0]) + 1);
      });
      receiptRow = lastReceipt + 1;
      if (receiptRow > receipts.getMaxRows()) receipts.insertRowsAfter(receipts.getMaxRows(), 100);
      receipts.getRange(receiptRow, 1, 1, 4).setNumberFormat('@').setValues([[lead.requestId, hash, row, 'Pending']]);
      SpreadsheetApp.flush();
    }
    if (row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 100);
    // Phone and ZIP stay text; leading zeros are preserved.
    sheet.getRange(row, 2, 1, FWC_HEADERS.length - 1).setNumberFormat('@');
    sheet.getRange(row, 1, 1, FWC_HEADERS.length).setValues([[
      new Date(),
      fwcSafeCell_(lead.name), fwcSafeCell_(lead.phone), fwcSafeCell_(lead.email),
      lead.service, FWC_SERVICES[lead.service], lead.zip, fwcSafeCell_(lead.message), 'New', lead.preferredContact, lead.propertyType
    ]]);
    sheet.getRange(row, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    SpreadsheetApp.flush();
    receipts.getRange(receiptRow, 4).setValues([['Saved']]);
    SpreadsheetApp.flush();
    // The saved receipt is authoritative. Release the lock before slow mail calls.
    lock.releaseLock();
    locked = false;
    try {
      var delivery = fwcNotify_(lead, settings);
      sheet.getRange(row, 9).setNote('Email delivery: ' + delivery);
    } catch (mailError) {
      // Email/notes must never turn a durable save into a failed submission.
      console.warn('FWC email notification or delivery note failed; lead remains saved.');
    }
    return fwcJson_({ accepted: true, requestId: lead.requestId, duplicate: false });
  } catch (ignored) {
    // Never return or log lead contents, secrets or internal Google errors.
    return fwcJson_({ accepted: false, code: 'SAVE_FAILED' });
  } finally {
    if (locked && lock) lock.releaseLock();
  }
}

/** Run manually once to authorize Sheets access and create the header row. */
function setupSheet() {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { fwcSheet_(fwcSettings_()); SpreadsheetApp.flush(); }
  finally { lock.releaseLock(); }
}

function fwcSettings_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  var secret = props.getProperty('SHARED_SECRET');
  if (!id || !secret || secret.length < 32) throw new Error('Configuration missing');
  return { id: id, secret: secret, sheetName: props.getProperty('SHEET_NAME') || 'Website Leads' };
}

function fwcReceiptSheet_(settings) {
  var book = SpreadsheetApp.openById(settings.id);
  var name = settings.sheetName + ' - Internal Receipts';
  var sheet = book.getSheetByName(name) || book.insertSheet(name);
  if (!sheet.getLastRow()) {
    sheet.getRange(1, 1, 1, 4).setValues([FWC_RECEIPT_HEADERS]);
    sheet.setFrozenRows(1);
  } else if (JSON.stringify(sheet.getRange(1, 1, 1, 4).getValues()[0]) !== JSON.stringify(FWC_RECEIPT_HEADERS)) {
    throw new Error('Unexpected receipt headers');
  }
  sheet.hideSheet();
  return sheet;
}

function fwcSheet_(settings) {
  var book = SpreadsheetApp.openById(settings.id);
  var sheet = book.getSheetByName(settings.sheetName) || book.insertSheet(settings.sheetName);
  var receipts = fwcReceiptSheet_(settings);
  if (!sheet.getLastRow()) {
    if (sheet.getMaxColumns() < FWC_HEADERS.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), FWC_HEADERS.length - sheet.getMaxColumns());
    sheet.getRange(1, 1, 1, FWC_HEADERS.length).setValues([FWC_HEADERS])
      .setFontWeight('bold').setBackground('#101010').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
    return sheet;
  }
  var oldHeaders = ['Submitted At', 'Request ID', 'Payload Hash'].concat(FWC_HEADERS.slice(1));
  var actual = sheet.getRange(1, 1, 1, Math.min(sheet.getMaxColumns(), 13)).getValues()[0];
  var legacy = JSON.stringify(actual.slice(0, 11)) === JSON.stringify(oldHeaders.slice(0, 11));
  if (legacy) {
    var tail = actual.slice(11, 13);
    if (!tail.every(function (value) { return value === '' || value == null; }) &&
        JSON.stringify(tail) !== JSON.stringify(oldHeaders.slice(11))) throw new Error('Unexpected extension columns');
    var count = sheet.getLastRow() - 1;
    if (count) {
      var values = sheet.getRange(2, 2, count, 2).getValues();
      // Verify every old receipt before changing the visible layout.
      values.forEach(function (value) {
        if (typeof value[0] !== 'string' || !value[0] || typeof value[1] !== 'string' || !value[1]) throw new Error('Missing historical receipt');
      });
      values.forEach(function (value, index) {
        var last = receipts.getLastRow();
        var found = last > 1 ? receipts.getRange(2, 1, last - 1, 1).createTextFinder(value[0]).matchEntireCell(true).useRegularExpression(false).findNext() : null;
        if (found) {
          var existing = receipts.getRange(found.getRow(), 1, 1, 4).getValues()[0];
          if (existing[1] !== value[1] || Number(existing[2]) !== index + 2 || existing[3] !== 'Saved') throw new Error('Conflicting historical receipt');
        } else {
          if (last + 1 > receipts.getMaxRows()) receipts.insertRowsAfter(receipts.getMaxRows(), 100);
          receipts.getRange(last + 1, 1, 1, 4).setNumberFormat('@').setValues([[value[0], value[1], index + 2, 'Saved']]);
        }
      });
    }
    // Delete only after receipts are durably copied. Retrying migration is safe.
    SpreadsheetApp.flush();
    sheet.deleteColumns(2, 2);
    actual = sheet.getRange(1, 1, 1, Math.min(sheet.getMaxColumns(), FWC_HEADERS.length)).getValues()[0];
  }
  if (JSON.stringify(actual.slice(0, 9)) !== JSON.stringify(FWC_HEADERS.slice(0, 9))) throw new Error('Unexpected sheet headers');
  var extension = actual.slice(9, 11);
  if (extension.every(function (value) { return value === '' || value == null; })) {
    if (sheet.getMaxColumns() < 11) sheet.insertColumnsAfter(sheet.getMaxColumns(), 11 - sheet.getMaxColumns());
    sheet.getRange(1, 10, 1, 2).setValues([FWC_HEADERS.slice(9)])
      .setFontWeight('bold').setBackground('#101010').setFontColor('#FFFFFF');
  } else if (JSON.stringify(extension) !== JSON.stringify(FWC_HEADERS.slice(9))) throw new Error('Unexpected extension columns');
  return sheet;
}

function fwcValidate_(body) {
  if (typeof body.requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.requestId)) return null;
  var data = body.lead;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  var keys = ['name', 'phone', 'email', 'service', 'zip', 'message', 'website'];
  for (var i = 0; i < keys.length; i++) if (typeof data[keys[i]] !== 'string') return null;
  var preferredContact = data.preferredContact === undefined ? 'Phone' : data.preferredContact;
  var propertyType = data.propertyType === undefined ? '' : data.propertyType;
  if (['Phone', 'Email'].indexOf(preferredContact) === -1 ||
      (data.propertyType !== undefined && ['Single Family', 'Multi Family', 'Commercial', 'Institutional', 'HOA'].indexOf(propertyType) === -1)) return null;
  var lead = {
    requestId: body.requestId, name: data.name.trim(), phone: data.phone.trim(),
    email: data.email, service: data.service, zip: data.zip, message: data.message.trim(),
    preferredContact: preferredContact, propertyType: propertyType
  };
  if (lead.name.length < 2 || lead.name.length > 100 ||
      !/^[+()\d\s.-]{7,25}$/.test(lead.phone) || lead.phone.replace(/\D/g, '').length < 10 ||
      (lead.preferredContact === 'Email' && !lead.email) ||
      lead.email.length > 254 || (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) ||
      !Object.prototype.hasOwnProperty.call(FWC_SERVICES, lead.service) ||
      !/^\d{5}$/.test(lead.zip) || lead.message.length > 2000 || data.website !== '') return null;
  return lead;
}

function fwcSafeCell_(value) {
  // Treat user input as literal text, including when exported to CSV later.
  return /^[\s]*[=+@-]/.test(value) ? "'" + value : value;
}

function fwcLegacyHash_(lead) {
  return fwcDigest_([lead.name, lead.phone, lead.email, lead.service, lead.zip, lead.message]);
}

function fwcHash_(lead) {
  var fields = [lead.name, lead.phone, lead.email, lead.service, lead.zip, lead.message];
  // Keep historical hashes valid for legacy payloads without the new selections.
  if (lead.propertyType || lead.preferredContact !== 'Phone') fields.push(lead.preferredContact, lead.propertyType);
  return fwcDigest_(fields);
}

function fwcDigest_(fields) {
  var payload = JSON.stringify(fields);
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, payload, Utilities.Charset.UTF_8)
    .map(function (byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
}

function fwcAllowWrite_() {
  var props = PropertiesService.getScriptProperties();
  var minute = String(Math.floor(Date.now() / 60000));
  var previous = props.getProperty('WRITE_WINDOW');
  var state = previous ? JSON.parse(previous) : { minute: minute, count: 0 };
  if (state.minute !== minute) state = { minute: minute, count: 0 };
  if (state.count >= 60) return false;
  state.count++;
  props.setProperty('WRITE_WINDOW', JSON.stringify(state));
  return true;
}

function fwcJson_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

/** Run once after updating the script to grant the new email permission. Sends no email. */
function authorizeEmail() {
  MailApp.getRemainingDailyQuota();
}

function fwcNotify_(lead, settings) {
  var inbox = 'nimantabandara@gmail.com';
  var admin = fwcEmail_(lead, settings, false);
  var customer = fwcEmail_(lead, settings, true);
  function send(to, replyTo, email) {
    try {
      if (MailApp.getRemainingDailyQuota() < 1) return 'quota exhausted';
      MailApp.sendEmail({
        to: to, replyTo: replyTo, name: 'FWC Plumbing & Rooter',
        subject: email.subject, body: email.text, htmlBody: email.html
      });
      return 'sent';
    } catch (ignored) {
      console.warn('FWC email send failed; lead remains saved.');
      return 'failed';
    }
  }
  var adminStatus = send(inbox, lead.email || inbox, admin);
  var customerStatus = lead.email ? send(lead.email, inbox, customer) : 'not provided';
  return 'Team: ' + adminStatus + '; Customer: ' + customerStatus;
}

function fwcEscapeHtml_(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
  });
}

function fwcEmail_(lead, settings, customer) {
  var subject = customer ? 'We received your estimate request | FWC Plumbing & Rooter' : 'New estimate request | FWC Plumbing & Rooter';
  var title = customer ? 'Your request is in.' : 'A new lead just arrived.';
  var intro = customer
    ? 'Thank you for contacting FWC Plumbing & Rooter. We have received your estimate request, and our team will review your details and contact you using your preferred method.'
    : 'A new website estimate has been requested, the customer’s information is below please contact them immediately';
  var fields = [
    ['Full name', lead.name], ['Phone', lead.phone], ['Email', lead.email || 'Not provided'],
    ['Preferred contact', lead.preferredContact], ['Property type', lead.propertyType || 'Not provided'],
    ['Service', FWC_SERVICES[lead.service]], ['ZIP code', lead.zip]
  ];
  var suffix = 'Preferred contact: ' + lead.preferredContact + '\nProperty type: ' + lead.propertyType;
  var message = lead.message === suffix ? '' : lead.message;
  if (message.slice(-(suffix.length + 1)) === '\n' + suffix) message = message.slice(0, -(suffix.length + 1));
  if (message) fields.push(['Project details', message]);
  fields.push(['Request reference', lead.requestId]);
  var rows = fields.map(function (field) {
    return '<tr><th scope="row" align="left" valign="top" style="padding:13px 16px;border-bottom:1px solid #e9e9ed;font-size:13px;font-weight:600;color:#595961;width:38%">' + fwcEscapeHtml_(field[0]) + '</th><td valign="top" style="padding:13px 16px;border-bottom:1px solid #e9e9ed;font-size:14px;color:#101010;overflow-wrap:anywhere;word-break:break-word">' + fwcEscapeHtml_(field[1]).replace(/\n/g, '<br>') + '</td></tr>';
  }).join('');
  var site = 'https://fwccompanies.services';
  var actions = customer ? [{ label: 'Visit fwccompanies.services', url: site }] : [];
  if (!customer) {
    if (lead.email) actions.push({ label: 'Reply to lead', url: 'mailto:' + encodeURIComponent(lead.email) });
    var phone = (lead.phone.charAt(0) === '+' ? '+' : '') + lead.phone.replace(/\D/g, '');
    actions.push({ label: 'Call now', url: 'tel:' + phone });
  }
  var buttons = actions.map(function (action) {
    return '<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;margin:0 8px 10px 0"><tr><td bgcolor="#101010" style="border-radius:8px"><a href="' + fwcEscapeHtml_(action.url) + '" style="display:inline-block;padding:14px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none">' + action.label + '</a></td></tr></table>';
  }).join('');
  var next = customer
    ? 'If you would like to reach us sooner, you can call 714-410-2728. This email confirms that we received your request; it does not confirm an appointment.'
    : 'Reply to this email to contact the customer when an email address was provided. Otherwise, use the phone number above.';
  var label = customer ? 'Estimate request received' : 'New website lead';
  var text = 'FWC Plumbing & Rooter\n\n' + title + '\n' + intro + '\n\n' +
    fields.map(function (field) { return field[0] + ': ' + field[1]; }).join('\n') +
    '\n\n' + next + '\n' + actions.map(function (action) { return action.label + ': ' + action.url; }).join('\n') + '\n\nFWC Plumbing & Rooter\nfwccompanies.services';
  var html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + fwcEscapeHtml_(subject) + '</title></head>' +
    '<body style="margin:0;padding:0;background:#f2f3f5;font-family:Arial,Helvetica,sans-serif;color:#101010">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f3f5"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e0e1e5;border-radius:16px;overflow:hidden">' +
    '<tr><td style="padding:26px 24px;background:#101010;border-top:4px solid #E51C35"><p style="margin:0;color:#ffffff;font-size:20px;font-weight:700">FWC Plumbing &amp; Rooter</p></td></tr>' +
    '<tr><td style="padding:28px 24px"><p style="margin:0 0 10px;color:#595961;font-size:13px;font-weight:700">' + label + '</p><h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">' + title + '</h1><p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#3f3f46">' + intro + '</p>' +
    '<table aria-label="Estimate request details" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e9e9ed;border-radius:10px;border-collapse:collapse;table-layout:fixed">' + rows + '</table>' +
    '<p style="margin:24px 0;font-size:14px;line-height:1.7;color:#3f3f46">' + next + '</p>' +
    buttons + '</td></tr>' +
    '<tr><td style="padding:20px 24px;background:#fafafa;border-top:1px solid #e9e9ed;font-size:12px;line-height:1.8;color:#595961"><strong style="color:#101010">FWC Plumbing &amp; Rooter</strong><br><a href="' + site + '" style="color:#101010">fwccompanies.services</a><br>You are receiving this because an estimate request was submitted on our website.</td></tr>' +
    '</table></td></tr></table></body></html>';
  return { subject: subject, text: text, html: html };
}
