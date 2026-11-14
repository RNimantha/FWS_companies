import type { Lead } from "./lead-schema";
export { leadSchema, type Lead } from "./lead-schema";
export async function submitLead(lead: Lead, key: string) {
  const endpoint = import.meta.env.VITE_LEAD_ENDPOINT;
  if (!endpoint)
    throw new Error(
      "Online requests are not available yet. Please call 714-410-2728 to request an estimate.",
    );
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(lead),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      "Your request could not be confirmed. Please try again or call 714-410-2728.",
    );
  const data = (await response.json()) as { accepted?: boolean };
  if (data.accepted !== true)
    throw new Error("We could not confirm receipt. Please call 714-410-2728.");
}
