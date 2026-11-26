import { trackMetaEvent } from "./meta-pixel";
type EventName =
  | "hero_cta_click"
  | "phone_click"
  | "lead_form_start"
  | "lead_form_submit"
  | "lead_form_success"
  | "lead_form_error";
// Retain the existing local event hook. Only mapped events reach consent-gated Meta.
export function track(name: EventName, location: string, attemptId?: string) {
  try {
    window.dispatchEvent(
      new CustomEvent("fwc:analytics", { detail: { event: name, location } }),
    );
    if (attemptId && name === "lead_form_success")
      trackMetaEvent({ name: "Lead", attemptId });
    if (attemptId && name === "lead_form_start")
      trackMetaEvent({ name: "LeadFormStart", attemptId });
  } catch {
    /* Analytics failures cannot affect form state or submission. */
  }
}
