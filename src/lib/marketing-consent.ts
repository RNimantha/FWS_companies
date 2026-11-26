export type MarketingConsent = "unknown" | "granted" | "denied";
export const CONSENT_STORAGE_KEY = "fwc-marketing-consent-v1";
const MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
let choice: MarketingConsent = "unknown";
let initialized = false;
const listeners = new Set<() => void>();

export function hasPrivacyOptOut(): boolean {
  return (
    typeof navigator !== "undefined" &&
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl === true
  );
}

function readStoredConsent(): MarketingConsent {
  try {
    const value = JSON.parse(
      localStorage.getItem(CONSENT_STORAGE_KEY) || "null",
    );
    if (
      value?.version === 1 &&
      (value.marketing === "granted" || value.marketing === "denied") &&
      typeof value.updatedAt === "number" &&
      value.updatedAt <= Date.now() &&
      Date.now() - value.updatedAt < MAX_AGE_MS
    )
      return value.marketing;
  } catch {
    /* No storage access means no persisted consent. */
  }
  return "unknown";
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function initializeMarketingConsent() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  choice = hasPrivacyOptOut() ? "denied" : readStoredConsent();
  window.addEventListener("storage", (event) => {
    if (event.key === CONSENT_STORAGE_KEY || event.key === null) {
      choice = hasPrivacyOptOut() ? "denied" : readStoredConsent();
      notify();
    }
  });
}

export function getMarketingConsent(): MarketingConsent {
  return hasPrivacyOptOut() ? "denied" : choice;
}

export function setMarketingConsent(value: "granted" | "denied") {
  choice = hasPrivacyOptOut() ? "denied" : value;
  try {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        marketing: choice,
        updatedAt: Date.now(),
      }),
    );
  } catch {
    /* Honor the choice in memory even when storage is unavailable. */
  }
  notify();
}

export function subscribeMarketingConsent(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function openMarketingPreferences() {
  window.dispatchEvent(new Event("fwc:cookie-settings"));
}
