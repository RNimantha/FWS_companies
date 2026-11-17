import { describe, it, expect, vi } from "vitest";
import { createLeadHandler, type LeadDependencies } from "../server/leads";
const body = {
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
function setup() {
  const deps: LeadDependencies = {
    origin: "https://fwccompanies.com",
    clientKey: () => "trusted-client",
    allowRequest: vi.fn(async () => true),
    claim: vi.fn(async () => "new" as const),
    accept: vi.fn(async () => {}),
    release: vi.fn(async () => {}),
    deliver: vi.fn(async () => {}),
  };
  const request = (patch: Record<string, unknown> = {}, origin = deps.origin) =>
    new Request("https://fwccompanies.com/api/leads", {
      method: "POST",
      headers: {
        origin,
        "content-type": "application/json",
        "idempotency-key": "12345678-1234-1234-1234-123456789012",
      },
      body: JSON.stringify({ ...body, ...patch }),
    });
  return { deps, request };
}
describe("server submission contract", () => {
  it("acknowledges only after destination delivery and receipt", async () => {
    const { deps, request } = setup();
    const response = await createLeadHandler(deps)(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ accepted: true });
    expect(deps.deliver).toHaveBeenCalledOnce();
    expect(deps.accept).toHaveBeenCalledOnce();
  });
  it("rejects cross-origin and invalid requests without delivery", async () => {
    const { deps, request } = setup();
    const handle = createLeadHandler(deps);
    expect(
      (await handle(request({}, "https://untrusted.example"))).status,
    ).toBe(403);
    expect((await handle(request({ phone: "bad" }))).status).toBe(422);
    expect(deps.deliver).not.toHaveBeenCalled();
  });
  it("returns failure and releases the claim when delivery rejects", async () => {
    const { deps, request } = setup();
    deps.deliver = vi.fn(async () => {
      throw new Error("provider unavailable");
    });
    expect((await createLeadHandler(deps)(request())).status).toBe(502);
    expect(deps.accept).not.toHaveBeenCalled();
    expect(deps.release).toHaveBeenCalledOnce();
  });
  it("acknowledges accepted retries without delivering again", async () => {
    const { deps, request } = setup();
    deps.claim = async () => "accepted";
    expect((await createLeadHandler(deps)(request())).status).toBe(200);
    expect(deps.deliver).not.toHaveBeenCalled();
  });
  it("blocks concurrent duplicates and rate-limited requests", async () => {
    const { deps, request } = setup();
    deps.claim = async () => "pending";
    expect((await createLeadHandler(deps)(request())).status).toBe(409);
    deps.allowRequest = async () => false;
    expect((await createLeadHandler(deps)(request())).status).toBe(429);
    expect(deps.deliver).not.toHaveBeenCalled();
  });
  it("rejects oversized bodies", async () => {
    const { deps, request } = setup();
    expect(
      (await createLeadHandler(deps)(request({ message: "x".repeat(9000) })))
        .status,
    ).toBe(400);
    expect(deps.deliver).not.toHaveBeenCalled();
  });
});
