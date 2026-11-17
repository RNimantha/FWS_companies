import { describe, expect, it, vi } from "vitest";
import { createGoogleSheetsDelivery } from "../server/google-apps-script";
const lead = {
  name: "Test Customer",
  phone: "7145550123",
  email: "",
  service: "plumbing",
  zip: "02870",
  message: "Test only",
  website: "",
  preferredContact: "Phone" as const,
  propertyType: "Single Family" as const,
};
const requestId = "12345678-1234-1234-1234-123456789012";
const config = {
  url: "https://script.google.com/macros/s/TEST_DEPLOYMENT/exec",
  secret: "x".repeat(64),
};
describe("Google Sheets server adapter", () => {
  it("forwards all validated fields and the same request ID using a server secret", async () => {
    const send = vi.fn<typeof fetch>(async () =>
      Response.json({ accepted: true, requestId }),
    );
    await createGoogleSheetsDelivery({ ...config, fetch: send })(
      lead,
      requestId,
    );
    const [url, options] = send.mock.calls[0];
    expect(url).toBe(config.url);
    expect(JSON.parse(options?.body as string)).toEqual({
      secret: config.secret,
      requestId,
      lead: {
        ...lead,
        message: `${lead.message}\nPreferred contact: Phone\nProperty type: Single Family`,
      },
    });
    expect(options?.redirect).toBe("follow");
    expect(url).not.toContain(config.secret);
  });
  it.each([
    { accepted: false, code: "SAVE_FAILED" },
    { accepted: true, requestId: "wrong-id" },
    {},
  ])("rejects unconfirmed acknowledgements %j", async (body) => {
    await expect(
      createGoogleSheetsDelivery({
        ...config,
        fetch: async () => Response.json(body),
      })(lead, requestId),
    ).rejects.toThrow("did not confirm");
  });
  it("rejects failed HTTP responses and Google login pages", async () => {
    await expect(
      createGoogleSheetsDelivery({
        ...config,
        fetch: async () => new Response("", { status: 503 }),
      })(lead, requestId),
    ).rejects.toThrow();
    await expect(
      createGoogleSheetsDelivery({
        ...config,
        fetch: async () => new Response("<html>Sign in</html>"),
      })(lead, requestId),
    ).rejects.toThrow();
  });
  it("rejects invalid form data before making a network request", async () => {
    const send = vi.fn<typeof fetch>();
    await expect(
      createGoogleSheetsDelivery({ ...config, fetch: send })(
        { ...lead, website: "spam" },
        requestId,
      ),
    ).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
  it.each([
    "https://untrusted.example/exec",
    "https://script.google.com/macros/s/TEST/dev",
    config.url + "?secret=unsafe",
  ])("rejects unexpected destinations %s", (url) => {
    expect(() => createGoogleSheetsDelivery({ ...config, url })).toThrow();
  });
});
