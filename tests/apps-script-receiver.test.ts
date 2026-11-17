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
function harness() {
  const rows: unknown[][] = [];
  const properties = new Map([
    ["SPREADSHEET_ID", "test-sheet"],
    ["SHARED_SECRET", secret],
  ]);
  const release = vi.fn();
  function range(row: number, col: number, height = 1, width = 1) {
    return {
      setValues(values: unknown[][]) {
        values.forEach((line, i) => {
          rows[row - 1 + i] ??= [];
          line.forEach((value, j) => {
            rows[row - 1 + i][col - 1 + j] = value;
          });
        });
        return this;
      },
      getValues() {
        return Array.from({ length: height }, (_, i) =>
          Array.from(
            { length: width },
            (_, j) => rows[row - 1 + i]?.[col - 1 + j],
          ),
        );
      },
      getValue() {
        return rows[row - 1]?.[col - 1];
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
            const index = rows.findIndex(
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
  };
  const context = {
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key: string) => properties.get(key) ?? null,
        setProperty: (key: string, value: string) => properties.set(key, value),
      }),
    },
    SpreadsheetApp: {
      openById: () => ({ getSheetByName: () => sheet }),
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
  return { rows, post, properties, release, setup: () => script.setupSheet() };
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
    expect(h.rows[1].slice(3)).toEqual([
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
    expect(h.rows[1][2]).toMatch(/^[a-f0-9]{64}$/);
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
  h.rows[0] = h.rows[0].slice(0, 11);
  const oldRow = [
    "Historical customer",
    "historic-id",
    "historic-hash",
    "original data",
  ];
  h.rows.push([...oldRow]);
  h.setup();
  expect(h.rows[0].slice(11)).toEqual(["Preferred Contact", "Property Type"]);
  expect(h.rows[1]).toEqual(oldRow);
});
it("preserves legacy duplicate receipts", () => {
  const h = harness();
  h.setup();
  h.rows[0] = h.rows[0].slice(0, 11);
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
  h.rows[0] = h.rows[0].slice(0, 11);
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
