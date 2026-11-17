import { describe, expect, it, vi } from "vitest";
import { handleNetlifyLead } from "../server/netlify-leads";
import { config } from "../netlify/functions/leads";
const origin = "https://fwccompanies.netlify.app";
const id = "12345678-1234-1234-1234-123456789012";
const lead = {
  name: "Test Customer",
  phone: "7145550123",
  email: "",
  service: "plumbing",
  zip: "92870",
  message: "",
  website: "",
  preferredContact: "Phone" as const,
  propertyType: "Single Family" as const,
};
const env = {
  GOOGLE_APPS_SCRIPT_URL: "https://script.google.com/macros/s/TEST/exec",
  GOOGLE_APPS_SCRIPT_SECRET: "s".repeat(64),
};
const request = (body: unknown = lead, from = origin) =>
  new Request(origin + "/api/leads", {
    method: "POST",
    headers: {
      Origin: from,
      "Content-Type": "application/json",
      "Idempotency-Key": id,
    },
    body: JSON.stringify(body),
  });
describe("Netlify /api/leads function", () => {
  it("registers the exact public path with platform per-client rate limiting", () => {
    expect(config.path).toBe("/api/leads");
    expect(config.rateLimit).toEqual({
      windowLimit: 10,
      windowSize: 60,
      aggregateBy: ["ip", "domain"],
    });
  });
  it("saves validated requests through the existing Google adapter", async () => {
    const send = vi.fn<typeof fetch>(async () =>
      Response.json({ accepted: true, requestId: id }),
    );
    const response = await handleNetlifyLead(
      request(),
      env,
      "trusted-ip",
      send,
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ accepted: true });
    expect(JSON.parse(send.mock.calls[0][1]?.body as string)).toEqual({
      secret: env.GOOGLE_APPS_SCRIPT_SECRET,
      requestId: id,
      lead: {
        ...lead,
        message: "Preferred contact: Phone\nProperty type: Single Family",
      },
    });
  });
  it("treats an acknowledged duplicate as success without generating a new ID", async () => {
    const send = vi.fn<typeof fetch>(async () =>
      Response.json({ accepted: true, requestId: id, duplicate: true }),
    );
    expect((await handleNetlifyLead(request(), env, "ip", send)).status).toBe(
      201,
    );
    expect(JSON.parse(send.mock.calls[0][1]?.body as string).requestId).toBe(
      id,
    );
  });
  it("returns 503 JSON when Functions runtime variables are missing", async () => {
    const send = vi.fn<typeof fetch>();
    const result = await handleNetlifyLead(request(), {}, "ip", send);
    expect(result.status).toBe(503);
    expect((await result.json()).accepted).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
  it("returns 405 for GET and rejects cross-origin submissions", async () => {
    const send = vi.fn<typeof fetch>();
    expect(
      (
        await handleNetlifyLead(
          new Request(origin + "/api/leads"),
          env,
          "ip",
          send,
        )
      ).status,
    ).toBe(405);
    expect(
      (
        await handleNetlifyLead(
          request(lead, "https://untrusted.example"),
          env,
          "ip",
          send,
        )
      ).status,
    ).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects malformed fields and spam without contacting Google", async () => {
    const send = vi.fn<typeof fetch>();
    expect(
      (
        await handleNetlifyLead(
          request({ ...lead, website: "spam" }),
          env,
          "ip",
          send,
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await handleNetlifyLead(
          request({ ...lead, phone: "12" }),
          env,
          "ip",
          send,
        )
      ).status,
    ).toBe(422);
    expect(send).not.toHaveBeenCalled();
  });
  it("does not claim success for a Google save failure", async () => {
    const result = await handleNetlifyLead(request(), env, "ip", async () =>
      Response.json({ accepted: false, code: "SAVE_FAILED" }),
    );
    expect(result.status).toBe(502);
    expect((await result.json()).accepted).toBe(false);
  });
  it("hides invalid configuration and rejects oversized requests", async () => {
    const send = vi.fn<typeof fetch>();
    expect(
      (
        await handleNetlifyLead(
          request(),
          { ...env, GOOGLE_APPS_SCRIPT_SECRET: "short" },
          "ip",
          send,
        )
      ).status,
    ).toBe(503);
    expect(
      (
        await handleNetlifyLead(
          request({ ...lead, message: "x".repeat(9000) }),
          env,
          "ip",
          send,
        )
      ).status,
    ).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });
});
