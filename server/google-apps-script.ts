import { leadSchema, type Lead } from "../src/lib/lead-schema";
export interface GoogleAppsScriptConfig {
  url: string;
  secret: string;
  fetch?: typeof fetch;
}
/** Server-only adapter for createLeadHandler's deliver dependency. */
export function createGoogleSheetsDelivery(config: GoogleAppsScriptConfig) {
  const url = new URL(config.url);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "script.google.com" ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)
  )
    throw new Error("Use the deployed Google Apps Script /exec URL.");
  if (config.secret.length < 32)
    throw new Error("Configure the server-side Apps Script shared secret.");
  const send = config.fetch ?? fetch;
  return async (lead: Lead, requestId: string): Promise<void> => {
    if (
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        requestId,
      )
    ) {
      throw new Error("Invalid request ID.");
    }
    const validated = leadSchema.parse(lead);
    // Legacy deployed Apps Script saves Message but ignores unknown fields.
    // Preserve both selections there until the extended receiver is deployed.
    const metadata = `Preferred contact: ${validated.preferredContact}\nProperty type: ${validated.propertyType}`;
    const message = [validated.message, metadata].filter(Boolean).join("\n");
    if (message.length > 2000)
      throw new Error("Lead message exceeds the receiver limit.");
    // Follow Google's ContentService redirect. Never place the secret in a URL.
    const response = await send(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: config.secret,
        requestId,
        lead: { ...validated, message },
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Google Sheets did not confirm receipt.");
    const result: unknown = await response.json();
    if (
      !result ||
      typeof result !== "object" ||
      !("accepted" in result) ||
      result.accepted !== true ||
      !("requestId" in result) ||
      result.requestId !== requestId
    ) {
      throw new Error("Google Sheets did not confirm receipt.");
    }
  };
}
