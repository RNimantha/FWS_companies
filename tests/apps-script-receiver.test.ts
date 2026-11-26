import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
const code = readFileSync(
  new URL("../integrations/google-apps-script/Code.gs", import.meta.url),
  "utf8",
);
const secret = "s".repeat(64);
const body = {
  secret,
  requestId: "12345678-1234-1234-1234-123456789012",
  lead: {
    name: "Test Customer",
    phone: "+17145550123",
    email: "",
    service: "plumbing",
    zip: "02870",
    message: '=IMPORTXML("example")',
    website: "",
    preferredContact: "Phone" as const,
    propertyType: "Single Family" as const,
  },
};
const legacyHeaders = [
  "Submitted At",
  "Request ID",
  "Payload Hash",
  "Full Name",
  "Phone",
  "Email",
  "Service Code",
  "Service Required",
  "ZIP Code",
  "Message",
  "Status",
  "Preferred Contact",
  "Property Type",
];
function harness() {
  const rows: unknown[][] = [];
  const receiptRows: unknown[][] = [];
  const notes = new Map<string, string>();
  const sendEmail = vi.fn();
  const quota = vi.fn(() => 100);
  const warn = vi.fn();
  const properties = new Map([
    ["SPREADSHEET_ID", "test-sheet"],
    ["SHARED_SECRET", secret],
  ]);
  const release = vi.fn();
  function range(
    row: number,
    col: number,
    height = 1,
    width = 1,
    sheetRows = rows,
  ) {
    return {
      setValues(values: unknown[][]) {
        values.forEach((line, i) => {
          sheetRows[row - 1 + i] ??= [];
          line.forEach((value, j) => {
            sheetRows[row - 1 + i][col - 1 + j] = value;
          });
        });
        return this;
      },
      getValues() {
        return Array.from({ length: height }, (_, i) =>
          Array.from(
            { length: width },
            (_, j) => sheetRows[row - 1 + i]?.[col - 1 + j],
          ),
        );
      },
      getValue() {
        return sheetRows[row - 1]?.[col - 1];
      },
      setNote(value: string) {
        notes.set(`${row}:${col}`, value);
        return this;
      },
      setNumberFormat() {
        return this;
      },
      setFontWeight() {
        return this;
      },
      setBackground() {
        return this;
      },
      setFontColor() {
        return this;
      },
      createTextFinder(value: string) {
        return {
          matchEntireCell() {
            return this;
          },
          useRegularExpression() {
            return this;
          },
          findNext() {
            const index = sheetRows.findIndex(
              (line, i) => i >= row - 1 && line[col - 1] === value,
            );
            return index < 0 ? null : { getRow: () => index + 1 };
          },
        };
      },
    };
  }
  const sheet = {
    getRange: range,
    getLastRow: () => rows.length,
    getMaxColumns: () => 26,
    getMaxRows: () => 1000,
    setFrozenRows: vi.fn(),
    deleteColumns: vi.fn((start: number, count: number) =>
      rows.forEach((row) => row.splice(start - 1, count)),
    ),
  };
  const receiptSheet = {
    getRange: (row: number, col: number, height = 1, width = 1) =>
      range(row, col, height, width, receiptRows),
    getLastRow: () => receiptRows.length,
    getMaxRows: () => 1000,
    setFrozenRows: vi.fn(),
    hideSheet: vi.fn(),
  };
  const sheets = new Map<string, typeof sheet | typeof receiptSheet>([
    ["Website Leads", sheet],
  ]);
  const context = {
    console: { warn },
    MailApp: { sendEmail, getRemainingDailyQuota: quota },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key: string) => properties.get(key) ?? null,
        setProperty: (key: string, value: string) => properties.set(key, value),
      }),
    },
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: (name: string) => sheets.get(name) || null,
        insertSheet: (name: string) => {
          sheets.set(name, receiptSheet);
          return receiptSheet;
        },
      }),
      flush: vi.fn(),
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: release,
        waitLock: vi.fn(),
      }),
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (text: string) => ({
        text,
        setMimeType() {
          return this;
        },
      }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: "SHA_256" },
      Charset: { UTF_8: "UTF_8" },
      computeDigest: (_: unknown, text: string) =>
        Array.from(createHash("sha256").update(text).digest()),
    },
  };
  runInNewContext(code, context);
  const script = context as unknown as {
    doPost(e: unknown): { text: string };
    setupSheet(): void;
  };
  const post = (data: unknown) =>
    JSON.parse(
      script.doPost({
        postData: { type: "application/json", contents: JSON.stringify(data) },
      }).text,
    );
  return {
    rows,
    receiptRows,
    receiptSheet,
    sheet,
    notes,
    sendEmail,
    quota,
    warn,
    post,
    properties,
    release,
    setup: () => script.setupSheet(),
  };
}
describe("Apps Script receiver with Google service doubles", () => {
  it("creates headers and saves every field as a new row, escaping formula-like values", () => {
    const h = harness();
    h.setup();
    expect(h.post(body)).toEqual({
      accepted: true,
      requestId: body.requestId,
      duplicate: false,
    });
    expect(h.rows).toHaveLength(2);
    expect(h.rows[1].slice(1)).toEqual([
      "Test Customer",
      "'+17145550123",
      "",
      "plumbing",
      "Plumbing",
      "02870",
      '\'=IMPORTXML("example")',
      "New",
      "Phone",
      "Single Family",
    ]);
    expect(h.receiptRows[1][1]).toMatch(/^[a-f0-9]{64}$/);
    expect(h.release).toHaveBeenCalledTimes(2);
  });
  it("deduplicates an identical retry and rejects changed content for that ID", () => {
    const h = harness();
    h.post(body);
    expect(h.post(body).duplicate).toBe(true);
    expect(
      h.post({ ...body, lead: { ...body.lead, message: "Different request" } })
        .code,
    ).toBe("IDEMPOTENCY_CONFLICT");
    expect(h.rows).toHaveLength(2);
  });
  it("rejects wrong secrets, spam and invalid fields without adding rows", () => {
    const h = harness();
    expect(h.post({ ...body, secret: "wrong" }).accepted).toBe(false);
    expect(
      h.post({ ...body, lead: { ...body.lead, website: "spam" } }).accepted,
    ).toBe(false);
    expect(
      h.post({ ...body, lead: { ...body.lead, zip: "123" } }).accepted,
    ).toBe(false);
    expect(h.rows).toHaveLength(0);
  });
  it("fails closed when configuration is missing or body is oversized", () => {
    const h = harness();
    expect(h.post({ ...body, extra: "x".repeat(9000) }).accepted).toBe(false);
    h.properties.delete("SHARED_SECRET");
    expect(h.post(body).accepted).toBe(false);
    expect(h.rows).toHaveLength(0);
  });
  it("refuses to overwrite a tab with unrelated headers", () => {
    const h = harness();
    h.rows.push(["Existing unrelated business data"]);
    expect(h.post(body).accepted).toBe(false);
    expect(h.rows).toEqual([["Existing unrelated business data"]]);
    expect(h.release).toHaveBeenCalledOnce();
  });
});

it("safely extends legacy headers without changing old rows", () => {
  const h = harness();
  h.setup();
  h.rows[0] = legacyHeaders.slice(0, 11);
  const oldRow = [
    new Date(),
    "historic-id",
    "historic-hash",
    "Historical customer",
    "original data",
  ];
  h.rows.push([...oldRow]);
  h.setup();
  expect(h.rows[0].slice(9)).toEqual(["Preferred Contact", "Property Type"]);
  expect(h.rows[1]).toEqual([oldRow[0], ...oldRow.slice(3)]);
  expect(h.receiptRows[1]).toEqual([
    "historic-id",
    "historic-hash",
    2,
    "Saved",
  ]);
});
it("preserves legacy duplicate receipts", () => {
  const h = harness();
  h.setup();
  h.rows[0] = legacyHeaders.slice(0, 11);
  const legacy = {
    name: body.lead.name,
    phone: body.lead.phone,
    email: body.lead.email,
    service: body.lead.service,
    zip: body.lead.zip,
    message: body.lead.message,
    website: "",
  };
  const hash = createHash("sha256")
    .update(
      JSON.stringify([
        legacy.name,
        legacy.phone,
        legacy.email,
        legacy.service,
        legacy.zip,
        legacy.message,
      ]),
    )
    .digest("hex");
  h.rows.push([new Date(), body.requestId, hash]);
  expect(h.post({ ...body, lead: legacy }).duplicate).toBe(true);
  expect(h.rows).toHaveLength(2);
});
it("rejects invalid preferences and changed property types on retry", () => {
  const h = harness();
  expect(
    h.post({ ...body, lead: { ...body.lead, preferredContact: "SMS" } })
      .accepted,
  ).toBe(false);
  expect(
    h.post({
      ...body,
      lead: { ...body.lead, preferredContact: "Email", email: "" },
    }).accepted,
  ).toBe(false);
  expect(
    h.post({ ...body, lead: { ...body.lead, propertyType: "Other" } }).accepted,
  ).toBe(false);
  h.post(body);
  expect(
    h.post({ ...body, lead: { ...body.lead, propertyType: "HOA" } }).code,
  ).toBe("IDEMPOTENCY_CONFLICT");
});

it("recognizes pre-upgrade receipts with matching compatibility metadata", () => {
  const h = harness();
  h.setup();
  h.rows[0] = legacyHeaders.slice(0, 11);
  const lead = {
    ...body.lead,
    message: "Preferred contact: Phone\nProperty type: Single Family",
  };
  const hash = createHash("sha256")
    .update(
      JSON.stringify([
        lead.name,
        lead.phone,
        lead.email,
        lead.service,
        lead.zip,
        lead.message,
      ]),
    )
    .digest("hex");
  h.rows.push([new Date(), body.requestId, hash]);
  expect(h.post({ ...body, lead }).duplicate).toBe(true);
  expect(h.post({ ...body, lead: { ...lead, propertyType: "HOA" } }).code).toBe(
    "IDEMPOTENCY_CONFLICT",
  );
  expect(h.rows).toHaveLength(2);
});

it("emails the team and customer once, with branded HTML and plain text", () => {
  const h = harness();
  const payload = {
    ...body,
    lead: {
      ...body.lead,
      email: "customer@example.com",
      preferredContact: "Email",
    },
  };
  expect(h.post(payload).accepted).toBe(true);
  expect(h.sendEmail).toHaveBeenCalledTimes(2);
  const [admin, customer] = h.sendEmail.mock.calls.map(([mail]) => mail);
  expect(admin.to).toBe("nimantabandara@gmail.com");
  expect(admin.replyTo).toBe("customer@example.com");
  expect(admin.htmlBody).not.toContain("docs.google.com");
  expect(admin.htmlBody).toContain('href="mailto:customer%40example.com"');
  expect(admin.htmlBody).toContain('href="tel:+17145550123"');
  expect(admin.htmlBody).toContain("Reply to lead");
  expect(admin.htmlBody).toContain("Call now");
  expect(admin.body).toContain("Reply to lead: mailto:customer%40example.com");
  expect(admin.body).toContain("Call now: tel:+17145550123");
  expect(admin.htmlBody).toContain(
    "A new website estimate has been requested, the customer’s information is below please contact them immediately",
  );
  expect(customer.to).toBe("customer@example.com");
  expect(customer.replyTo).toBe("nimantabandara@gmail.com");
  expect(customer.htmlBody).toContain("Your request is in.");
  expect(customer.htmlBody).not.toContain("docs.google.com");
  expect(customer.htmlBody).toContain('href="https://fwccompanies.services"');
  expect(customer.htmlBody).toContain('bgcolor="#101010"');
  expect(customer.htmlBody).not.toContain("tel:");
  expect(customer.htmlBody).not.toContain("For urgent help");
  expect(customer.htmlBody).not.toContain("ONE CALL, WE DO IT ALL");
  expect(customer.body).toMatch(/^FWC Plumbing & Rooter\n/);
  expect(customer.body.match(/714-410-2728/g)).toHaveLength(1);
  expect(customer.htmlBody.match(/714-410-2728/g)).toHaveLength(1);
  for (const mail of [admin, customer]) {
    expect(mail.name).toBe("FWC Plumbing & Rooter");
    expect(mail.htmlBody).toContain("#E51C35");
    expect(mail.htmlBody).toContain("Single Family");
    expect(mail.htmlBody).not.toContain(secret);
    expect(mail.body).toContain("Request reference: " + body.requestId);
  }
  expect(h.notes.get("2:9")).toBe("Email delivery: Team: sent; Customer: sent");
  expect(h.post(payload).duplicate).toBe(true);
  expect(h.sendEmail).toHaveBeenCalledTimes(2);
});

it("notifies only the team when no customer email is provided", () => {
  const h = harness();
  expect(h.post(body).accepted).toBe(true);
  expect(h.sendEmail).toHaveBeenCalledOnce();
  expect(h.sendEmail.mock.calls[0][0].to).toBe("nimantabandara@gmail.com");
  expect(h.notes.get("2:9")).toContain("Customer: not provided");
  expect(h.sendEmail.mock.calls[0][0].htmlBody).not.toContain("mailto:");
  expect(h.sendEmail.mock.calls[0][0].htmlBody).toContain("Call now");
});

it("escapes customer HTML and strips only the matching compatibility suffix", () => {
  const h = harness();
  h.post({
    ...body,
    lead: {
      ...body.lead,
      name: '<img src=x onerror="alert(1)">',
      message:
        "<script>bad()</script>\nPreferred contact: Phone\nProperty type: Single Family",
    },
  });
  const mail = h.sendEmail.mock.calls[0][0];
  expect(mail.htmlBody).toContain("&lt;img");
  expect(mail.htmlBody).toContain("&lt;script&gt;");
  expect(mail.htmlBody).not.toContain("<script>");
  expect(mail.body).toContain("Project details: <script>bad()</script>");
  expect(mail.body.match(/Preferred contact: Phone/g)).toHaveLength(1);
  expect(mail.body).toContain(
    "Project details: <script>bad()</script>\nRequest reference:",
  );
});

it("preserves saved leads on email failure, records status and avoids duplicate mail retries", () => {
  const h = harness();
  h.sendEmail.mockImplementationOnce(() => {
    throw new Error("Provider unavailable");
  });
  const payload = {
    ...body,
    lead: { ...body.lead, email: "customer@example.com" },
  };
  expect(h.post(payload).accepted).toBe(true);
  expect(h.rows).toHaveLength(2);
  expect(h.notes.get("2:9")).toBe(
    "Email delivery: Team: failed; Customer: sent",
  );
  expect(h.post(payload).duplicate).toBe(true);
  expect(h.sendEmail).toHaveBeenCalledTimes(2);
});

it("records exhausted mail quota without rejecting the saved lead", () => {
  const h = harness();
  h.quota.mockReturnValue(0);
  expect(h.post(body).accepted).toBe(true);
  expect(h.sendEmail).not.toHaveBeenCalled();
  expect(h.notes.get("2:9")).toContain("Team: quota exhausted");
});

it("sends no emails for rejected requests or idempotency conflicts", () => {
  const h = harness();
  h.post({ ...body, secret: "wrong" });
  h.post({ ...body, lead: { ...body.lead, website: "spam" } });
  expect(h.sendEmail).not.toHaveBeenCalled();
  h.post(body);
  h.post({ ...body, lead: { ...body.lead, propertyType: "HOA" } });
  expect(h.sendEmail).toHaveBeenCalledOnce();
});

it("keeps internal identifiers out of the visible sheet and hides receipts", () => {
  const h = harness();
  h.post(body);
  expect(h.rows[0]).not.toContain("Request ID");
  expect(h.rows[0]).not.toContain("Payload Hash");
  expect(h.rows[1]).not.toContain(body.requestId);
  expect(h.receiptRows[1][0]).toBe(body.requestId);
  expect(h.receiptRows[1].slice(2)).toEqual([2, "Saved"]);
  expect(h.receiptSheet.hideSheet).toHaveBeenCalled();
});

it("migrates all 13 legacy columns without changing customer data or duplicating receipts", () => {
  const h = harness();
  h.post(body);
  const visible = [...h.rows[1]];
  h.rows[0] = [...legacyHeaders];
  h.rows[1] = [
    visible[0],
    h.receiptRows[1][0],
    h.receiptRows[1][1],
    ...visible.slice(1),
  ];
  h.setup();
  h.setup();
  expect(h.rows[1]).toEqual(visible);
  expect(h.rows[0]).toHaveLength(11);
  expect(h.receiptRows).toHaveLength(2);
  expect(h.post(body).duplicate).toBe(true);
});

it("does not delete legacy columns when copying receipts fails, and safely resumes", () => {
  const h = harness();
  h.rows.push(
    [...legacyHeaders],
    [new Date(), body.requestId, "old-hash", "Customer"],
  );
  const original = h.receiptSheet.getRange;
  const spy = vi
    .spyOn(h.receiptSheet, "getRange")
    .mockImplementation((...args) => {
      const range = original(...args);
      if (args[0] === 2 && args[1] === 1)
        return {
          ...range,
          setValues: () => {
            throw new Error("Storage interrupted");
          },
        };
      return range;
    });
  expect(() => h.setup()).toThrow();
  expect(h.sheet.deleteColumns).not.toHaveBeenCalled();
  expect(h.rows[0]).toEqual(legacyHeaders);
  spy.mockRestore();
  h.setup();
  expect(h.rows[1]).toEqual([expect.any(Date), "Customer"]);
  expect(h.receiptRows[1]).toEqual([body.requestId, "old-hash", 2, "Saved"]);
});

it("recovers an interrupted visible write using the same reserved row", () => {
  const h = harness();
  h.setup();
  const original = h.sheet.getRange;
  let interrupted = false;
  vi.spyOn(h.sheet, "getRange").mockImplementation((...args) => {
    const range = original(...args);
    if (!interrupted && args[0] === 2 && args[1] === 1) {
      interrupted = true;
      return {
        ...range,
        setValues: () => {
          throw new Error("Storage interrupted");
        },
      };
    }
    return range;
  });
  expect(h.post(body).accepted).toBe(false);
  expect(h.receiptRows[1][3]).toBe("Pending");
  expect(h.sendEmail).not.toHaveBeenCalled();
  expect(h.post(body).accepted).toBe(true);
  expect(h.rows).toHaveLength(2);
  expect(h.receiptRows).toHaveLength(2);
  expect(h.receiptRows[1][3]).toBe("Saved");
  expect(h.post(body).duplicate).toBe(true);
  expect(h.sendEmail).toHaveBeenCalledOnce();
});
