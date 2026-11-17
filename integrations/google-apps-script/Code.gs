/**
 * FWC estimate requests -> Google Sheets.
 * Paste into Apps Script. Set Script Properties as described in README.md.
 * Invoke setupSheet once, then deploy as a web app executing as the owner.
 * Requests must come through the website backend, not directly from the browser.
 */
var FWC_HEADERS = [
  'Submitted At', 'Request ID', 'Payload Hash', 'Full Name', 'Phone', 'Email',
  'Service Code', 'Service Required', 'ZIP Code', 'Message', 'Status',
  'Preferred Contact', 'Property Type'
];
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
    var hash = fwcHash_(lead);
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var previous = sheet.getRange(2, 2, lastRow - 1, 1)
        .createTextFinder(lead.requestId).matchEntireCell(true).useRegularExpression(false).findNext();
      if (previous) {
        var storedHash = sheet.getRange(previous.getRow(), 3).getValue();
        var compatibility = 'Preferred contact: ' + lead.preferredContact + '\nProperty type: ' + lead.propertyType;
        var metadataMatches = lead.message === compatibility || lead.message.slice(-(compatibility.length + 1)) === '\n' + compatibility;
        // Before this receiver was updated, the server preserved the new values in Message.
        // Accept that same six-field receipt only when its metadata agrees with the new fields.
        if (storedHash !== hash && !(metadataMatches && storedHash === fwcLegacyHash_(lead))) {
          return fwcJson_({ accepted: false, code: 'IDEMPOTENCY_CONFLICT' });
        }
        return fwcJson_({ accepted: true, requestId: lead.requestId, duplicate: true });
      }
    }
    // A durable global cap. Per-client limits belong in the website backend.
    if (!fwcAllowWrite_()) return fwcJson_({ accepted: false, code: 'RATE_LIMITED' });
    var row = lastRow + 1;
    if (row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 100);
    // Phone and ZIP stay text; leading zeros are preserved.
    sheet.getRange(row, 2, 1, FWC_HEADERS.length - 1).setNumberFormat('@');
    sheet.getRange(row, 1, 1, FWC_HEADERS.length).setValues([[
      new Date(), lead.requestId, hash,
      fwcSafeCell_(lead.name), fwcSafeCell_(lead.phone), fwcSafeCell_(lead.email),
      lead.service, FWC_SERVICES[lead.service], lead.zip, fwcSafeCell_(lead.message), 'New', lead.preferredContact, lead.propertyType
    ]]);
    sheet.getRange(row, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    SpreadsheetApp.flush();
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

function fwcSheet_(settings) {
  var spreadsheet = SpreadsheetApp.openById(settings.id);
  var sheet = spreadsheet.getSheetByName(settings.sheetName) || spreadsheet.insertSheet(settings.sheetName);
  var empty = sheet.getLastRow() === 0;
  var migrate = false;
  if (!empty) {
    var actual = sheet.getRange(1, 1, 1, Math.min(sheet.getMaxColumns(), FWC_HEADERS.length)).getValues()[0];
    var legacy = FWC_HEADERS.slice(0, 11);
    if (JSON.stringify(actual.slice(0, 11)) !== JSON.stringify(legacy)) throw new Error('Unexpected sheet headers');
    var tail = actual.slice(11);
    var blank = tail.every(function (value) { return value === '' || value == null; });
    if (!blank && JSON.stringify(tail) !== JSON.stringify(FWC_HEADERS.slice(11))) throw new Error('Unexpected extension columns');
    migrate = blank;
  }
  if (sheet.getMaxColumns() < FWC_HEADERS.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), FWC_HEADERS.length - sheet.getMaxColumns());
  if (empty) {
    sheet.getRange(1, 1, 1, FWC_HEADERS.length).setValues([FWC_HEADERS])
      .setFontWeight('bold').setBackground('#101010').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  } else if (migrate) {
    // Append columns only. Never rewrite or infer values for historical lead rows.
    sheet.getRange(1, 12, 1, 2).setValues([FWC_HEADERS.slice(11)])
      .setFontWeight('bold').setBackground('#101010').setFontColor('#FFFFFF');
  }
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
