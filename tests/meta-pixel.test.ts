import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MetaPixel } from "../src/lib/meta-pixel";

const attemptId = "12345678-1234-1234-1234-123456789012";
let win: EventTarget & {
  location: { origin: string; hostname: string };
  fbq?: MetaPixel;
  _fbq?: MetaPixel;
};
let storage: Map<string, string>;
let append: ReturnType<typeof vi.fn>;
let click: (event: unknown) => void;
let doc: { cookie: string };
class LinkTarget {
  constructor(public link: { protocol: string; href: string }) {}
  closest() {
    return this.link;
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("PROD", true);
  vi.stubEnv("VITE_META_PIXEL_ENABLED", "true");
  vi.stubEnv("VITE_META_PIXEL_TEST_MODE", "false");
  vi.stubEnv("VITE_META_PIXEL_ID", "4096193424023864");
  win = Object.assign(new EventTarget(), {
    location: {
      origin: "https://fwccompanies.services",
      hostname: "fwccompanies.services",
    },
  });
  storage = new Map();
  append = vi.fn();
  doc = Object.assign(
    { cookie: "" },
    {
      getElementById: vi.fn(() => null),
      createElement: vi.fn(() => ({})),
      head: { appendChild: append },
      addEventListener: vi.fn(
        (name: string, handler: (event: unknown) => void) => {
          if (name === "click") click = handler;
        },
      ),
    },
  );
  vi.stubGlobal("window", win);
  vi.stubGlobal("location", win.location);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("navigator", { globalPrivacyControl: false });
  vi.stubGlobal("Element", LinkTarget);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function setup(grant = true) {
  const pixel = await import("../src/lib/meta-pixel");
  const consent = await import("../src/lib/marketing-consent");
  pixel.initializeMetaTracking();
  if (grant) consent.setMarketingConsent("granted");
  return { ...pixel, ...consent };
}
const events = () =>
  win.fbq?.queue.filter(
    (args) => args[0] === "track" || args[0] === "trackCustom",
  ) ?? [];

describe("consent-controlled Meta Pixel", () => {
  it("makes no Meta request or queued event before consent or after rejection", async () => {
    const api = await setup(false);
    expect(win.fbq).toBeUndefined();
    expect(append).not.toHaveBeenCalled();
    expect(api.trackMetaEvent({ name: "Lead", attemptId })).toBe(false);
    api.setMarketingConsent("denied");
    expect(win.fbq).toBeUndefined();
    expect(append).not.toHaveBeenCalled();
  });
  it("loads the official script, disables auto configuration before init, and initializes once", async () => {
    const api = await setup();
    api.initializeMetaTracking();
    api.setMarketingConsent("granted");
    expect(append).toHaveBeenCalledOnce();
    expect(append.mock.calls[0][0]).toMatchObject({
      src: "https://connect.facebook.net/en_US/fbevents.js",
      async: true,
    });
    expect(win.fbq?.queue.slice(0, 4)).toEqual([
      ["consent", "revoke"],
      ["set", "autoConfig", false, "4096193424023864"],
      ["init", "4096193424023864"],
      ["consent", "grant"],
    ]);
    expect(events().map((args) => args[1])).toEqual(["PageView"]);
  });
  it("deduplicates conversions and form starts per UUID attempt without arbitrary parameters", async () => {
    const api = await setup();
    for (const name of ["Lead", "LeadFormStart"] as const) {
      expect(api.trackMetaEvent({ name, attemptId })).toBe(true);
      expect(api.trackMetaEvent({ name, attemptId })).toBe(false);
      expect(
        api.trackMetaEvent({ name, attemptId: "customer@example.com" }),
      ).toBe(false);
    }
    api.trackMetaEvent({ name: "PageView" });
    api.trackMetaEvent({ name: "Contact" });
    api.trackMetaEvent({ name: "EstimateButtonClick" });
    expect(events().map((args) => args.slice(0, 3))).toEqual([
      ["track", "PageView", {}],
      ["track", "Lead", {}],
      ["trackCustom", "LeadFormStart", {}],
      ["track", "Contact", {}],
      ["trackCustom", "EstimateButtonClick", {}],
    ]);
  });
  it("does not replay pre-consent form events when consent is later granted", async () => {
    const api = await setup(false);
    api.trackMetaEvent({ name: "Lead", attemptId });
    api.trackMetaEvent({ name: "LeadFormStart", attemptId });
    api.setMarketingConsent("granted");
    expect(events().map((args) => args[1])).toEqual(["PageView"]);
  });
  it("withdraws consent, discards queued events and clears accessible Meta cookies", async () => {
    const api = await setup();
    api.trackMetaEvent({ name: "Lead", attemptId });
    api.setMarketingConsent("denied");
    expect(events()).toEqual([]);
    expect(win.fbq?.queue.at(-1)).toEqual(["consent", "revoke"]);
    expect(doc.cookie).toContain("Max-Age=0");
    expect(api.trackMetaEvent({ name: "Contact" })).toBe(false);
    api.setMarketingConsent("granted");
    expect(append).toHaveBeenCalledOnce();
    expect(api.trackMetaEvent({ name: "Lead", attemptId })).toBe(false);
  });
  it("deduplicates PageView after revoke/re-grant when the SDK already processed it", async () => {
    const api = await setup();
    win.fbq!.callMethod = vi.fn();
    api.setMarketingConsent("denied");
    api.setMarketingConsent("granted");
    expect(win.fbq!.callMethod).not.toHaveBeenCalledWith(
      "track",
      "PageView",
      expect.anything(),
      expect.anything(),
    );
  });
  it("honors Global Privacy Control even with a previously accepted choice", async () => {
    vi.stubGlobal("navigator", { globalPrivacyControl: true });
    const api = await setup();
    expect(api.getMarketingConsent()).toBe("denied");
    expect(win.fbq).toBeUndefined();
    expect(api.trackMetaEvent({ name: "Lead", attemptId })).toBe(false);
  });
  it.each([
    "http://localhost:5173",
    "https://preview.netlify.app",
    "https://fwccompanies.com",
    "http://fwccompanies.services",
  ])(
    "is disabled on %s unless the testing override is explicit",
    async (origin) => {
      win.location.origin = origin;
      const api = await setup();
      expect(api.isMetaTrackingEnabled()).toBe(false);
      expect(append).not.toHaveBeenCalled();
      vi.stubEnv("VITE_META_PIXEL_TEST_MODE", "true");
      api.setMarketingConsent("granted");
      expect(append).toHaveBeenCalledOnce();
    },
  );
  it("is disabled in development builds and supports an explicit kill switch", async () => {
    vi.stubEnv("PROD", false);
    const api = await setup();
    expect(append).not.toHaveBeenCalled();
    vi.stubEnv("VITE_META_PIXEL_TEST_MODE", "true");
    vi.stubEnv("VITE_META_PIXEL_ENABLED", "false");
    api.setMarketingConsent("granted");
    expect(api.isMetaTrackingEnabled()).toBe(false);
    expect(append).not.toHaveBeenCalled();
  });
  it("handles stored consent, expiry, and blocked localStorage", async () => {
    storage.set(
      "fwc-marketing-consent-v1",
      JSON.stringify({
        version: 1,
        marketing: "granted",
        updatedAt: Date.now() - 181 * 86400000,
      }),
    );
    const api = await setup(false);
    expect(api.getMarketingConsent()).toBe("unknown");
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw Error("Blocked");
      },
    });
    expect(() => api.setMarketingConsent("granted")).not.toThrow();
    expect(api.getMarketingConsent()).toBe("granted");
  });
  it("restores a valid persisted choice and honors withdrawal in another tab", async () => {
    storage.set(
      "fwc-marketing-consent-v1",
      JSON.stringify({
        version: 1,
        marketing: "granted",
        updatedAt: Date.now(),
      }),
    );
    const api = await setup(false);
    expect(events()).toHaveLength(1);
    storage.clear();
    win.dispatchEvent(
      Object.assign(new Event("storage"), { key: "fwc-marketing-consent-v1" }),
    );
    expect(api.getMarketingConsent()).toBe("unknown");
    expect(api.trackMetaEvent({ name: "Contact" })).toBe(false);
  });
  it("counts all telephone/estimate links once through the delegated listener", async () => {
    await setup();
    click({
      button: 0,
      target: new LinkTarget({ protocol: "tel:", href: "tel:+17144102728" }),
    });
    click({
      button: 0,
      target: new LinkTarget({
        protocol: "https:",
        href: "https://fwccompanies.services/estimate",
      }),
    });
    click({
      button: 0,
      target: new LinkTarget({
        protocol: "https:",
        href: "https://example.com/estimate",
      }),
    });
    expect(events().map((args) => args[1])).toEqual([
      "PageView",
      "Contact",
      "EstimateButtonClick",
    ]);
  });
  it("contains SDK failures and sends Lead only through the confirmed success hook", async () => {
    const api = await setup();
    const { track } = await import("../src/lib/analytics");
    for (const name of [
      "lead_form_submit",
      "lead_form_error",
      "phone_click",
      "hero_cta_click",
    ] as const)
      track(name, "estimate", attemptId);
    expect(events().map((args) => args[1])).toEqual(["PageView"]);
    track("lead_form_success", "estimate", attemptId);
    track("lead_form_success", "estimate", attemptId);
    expect(events().filter((args) => args[1] === "Lead")).toHaveLength(1);
    win.fbq!.callMethod = () => {
      throw Error("Blocked tracker");
    };
    expect(() =>
      track(
        "lead_form_success",
        "estimate",
        "22345678-1234-1234-1234-123456789012",
      ),
    ).not.toThrow();
    expect(api.trackMetaEvent({ name: "Contact" })).toBe(false);
  });
  it("does not initialize a second copy over an existing Pixel installation", async () => {
    win.fbq = vi.fn() as unknown as MetaPixel;
    const api = await setup();
    expect(append).not.toHaveBeenCalled();
    expect(api.trackMetaEvent({ name: "Contact" })).toBe(false);
  });
});
