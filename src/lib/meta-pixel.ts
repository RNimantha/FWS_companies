import {
  getMarketingConsent,
  initializeMarketingConsent,
  subscribeMarketingConsent,
} from "./marketing-consent";

export const META_PIXEL_ID =
  import.meta.env.VITE_META_PIXEL_ID || "4096193424023864";
type StandardEvent = "PageView" | "Lead" | "Contact";
type CustomEventName = "EstimateButtonClick" | "LeadFormStart";
type PixelArguments =
  | ["init", string]
  | ["consent", "grant" | "revoke"]
  | ["set", "autoConfig", false, string]
  | ["track", StandardEvent, Record<string, never>, { eventID: string }]
  | [
      "trackCustom",
      CustomEventName,
      Record<string, never>,
      { eventID: string },
    ];
export interface MetaPixel {
  (...args: PixelArguments): void;
  callMethod?: (...args: PixelArguments) => void;
  queue: PixelArguments[];
  push: MetaPixel;
  loaded: boolean;
  version: string;
}
declare global {
  interface Window {
    fbq?: MetaPixel;
    _fbq?: MetaPixel;
  }
}
export type MetaTrackingEvent =
  | { name: "PageView" | "Contact" | "EstimateButtonClick" }
  | { name: "Lead" | "LeadFormStart"; attemptId: string };

let initialized = false;
let installed = false;
let activeConsent = false;
const sent = new Set<string>();
const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;

export function isMetaTrackingEnabled(): boolean {
  if (
    typeof window === "undefined" ||
    import.meta.env.VITE_META_PIXEL_ENABLED === "false"
  )
    return false;
  if (!/^\d{8,20}$/.test(META_PIXEL_ID)) return false;
  return (
    import.meta.env.VITE_META_PIXEL_TEST_MODE === "true" ||
    (import.meta.env.PROD &&
      window.location.origin === "https://fwccompanies.services")
  );
}

function clearMetaCookies() {
  // Third-party cookies cannot be cleared by this origin.
  const host = window.location.hostname;
  const labels = host.split(".");
  const domains = ["", host];
  for (let i = 1; i < labels.length - 1; i++)
    domains.push(labels.slice(i).join("."));
  for (const name of ["_fbp", "_fbc"])
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain ? `; domain=${domain}` : ""}`;
    }
}

function applyConsent() {
  try {
    const granted =
      getMarketingConsent() === "granted" && isMetaTrackingEnabled();
    if (!granted) {
      activeConsent = false;
      const pixel = window.fbq;
      if (initialized && pixel) {
        // Discard unsent events if the visitor withdraws while the SDK is loading.
        if (!pixel.callMethod && Array.isArray(pixel.queue)) {
          pixel.queue = pixel.queue.filter(
            (args) =>
              args[0] !== "track" &&
              args[0] !== "trackCustom" &&
              !(args[0] === "consent" && args[1] === "grant"),
          );
        }
        pixel("consent", "revoke");
      }
      clearMetaCookies();
      return;
    }
    if (!initialized) {
      // Official Meta base-code queue, adapted to TypeScript and deferred consent.
      // Avoid mixing an unknown second installation with this one.
      if (window.fbq || document.getElementById("fwc-meta-pixel")) return;
      const pixel: MetaPixel = Object.assign(
        (...args: PixelArguments) => {
          if (pixel.callMethod) pixel.callMethod(...args);
          else pixel.queue.push(args);
        },
        { queue: [] as PixelArguments[], loaded: true, version: "2.0" },
      ) as MetaPixel;
      pixel.push = pixel;
      window.fbq = pixel;
      if (!window._fbq) window._fbq = pixel;
      pixel("consent", "revoke");
      pixel("set", "autoConfig", false, META_PIXEL_ID);
      pixel("init", META_PIXEL_ID);
      initialized = true;
      const script = document.createElement("script");
      script.id = "fwc-meta-pixel";
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      script.referrerPolicy = "strict-origin-when-cross-origin";
      document.head.appendChild(script);
    }
    if (!activeConsent) {
      window.fbq?.("consent", "grant");
      activeConsent = true;
    }
    trackMetaEvent({ name: "PageView" });
  } catch {
    /* Marketing must never block the page or form. */
  }
}

/** No arbitrary parameters: form values and link contents cannot reach Meta here. */
export function trackMetaEvent(event: MetaTrackingEvent): boolean {
  try {
    if (
      !isMetaTrackingEnabled() ||
      getMarketingConsent() !== "granted" ||
      !initialized ||
      !activeConsent ||
      !window.fbq
    )
      return false;
    const name = event.name;
    if (
      ![
        "PageView",
        "Lead",
        "Contact",
        "EstimateButtonClick",
        "LeadFormStart",
      ].includes(name)
    )
      return false;
    const attemptId = "attemptId" in event ? event.attemptId : undefined;
    if (
      (name === "Lead" || name === "LeadFormStart") &&
      (!attemptId || !UUID.test(attemptId))
    )
      return false;
    const onceKey =
      name === "PageView"
        ? name
        : attemptId
          ? `${name}:${attemptId}`
          : undefined;
    if (onceKey && sent.has(onceKey)) return false;
    const eventID = attemptId
      ? `fwc-${name}-${attemptId}`
      : crypto.randomUUID();
    // Mark first so repeated callbacks cannot race. No replay of pre-consent events.
    if (onceKey) sent.add(onceKey);
    if (name === "EstimateButtonClick" || name === "LeadFormStart")
      window.fbq("trackCustom", name, {}, { eventID });
    else window.fbq("track", name, {}, { eventID });
    return true;
  } catch {
    return false;
  }
}

function trackLinkClick(event: MouseEvent) {
  try {
    if (event.button !== 0) return;
    const link =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a[href]")
        : null;
    if (!link) return;
    // The URL is inspected locally only, never included in an event parameter.
    if (link.protocol === "tel:") trackMetaEvent({ name: "Contact" });
    else {
      const url = new URL(link.href);
      if (
        url.origin === location.origin &&
        (url.pathname.replace(/\/$/, "") === "/estimate" ||
          url.hash === "#estimate")
      )
        trackMetaEvent({ name: "EstimateButtonClick" });
    }
  } catch {
    /* Leave normal link navigation intact. */
  }
}

/** Called once from main.tsx, outside React effects / StrictMode. SSR-safe. */
export function initializeMetaTracking() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  initializeMarketingConsent();
  subscribeMarketingConsent(applyConsent);
  document.addEventListener("click", trackLinkClick);
  applyConsent();
}
