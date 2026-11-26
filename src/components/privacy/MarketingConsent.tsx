import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getMarketingConsent,
  hasPrivacyOptOut,
  setMarketingConsent,
  subscribeMarketingConsent,
} from "../../lib/marketing-consent";

export function MarketingConsent() {
  const consent = useSyncExternalStore(
    subscribeMarketingConsent,
    getMarketingConsent,
    () => "pending" as const,
  );
  const [open, setOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    function show() {
      previousFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setOpen(true);
    }
    window.addEventListener("fwc:cookie-settings", show);
    return () => window.removeEventListener("fwc:cookie-settings", show);
  }, []);
  useEffect(() => {
    if (open) heading.current?.focus();
  }, [open]);
  function close() {
    setOpen(false);
    previousFocus.current?.focus();
  }
  function save(value: "granted" | "denied") {
    setMarketingConsent(value);
    close();
  }
  if (consent === "pending" || (!open && consent !== "unknown")) return null;
  const optOut = hasPrivacyOptOut();
  return (
    <section className="marketing-consent" aria-labelledby="cookie-heading">
      <h2 id="cookie-heading" tabIndex={-1} ref={heading}>
        Your cookie choices
      </h2>
      <p>
        We use necessary storage for your preferences. With your permission,
        Meta Pixel uses marketing cookies to measure ads and website actions and
        help show relevant ads. Your form works whether you accept or reject
        marketing.
      </p>
      <a href="/privacy">Privacy and cookie information</a>
      {optOut && (
        <p role="status">
          Your browser’s Global Privacy Control signal disables marketing
          tracking.
        </p>
      )}
      <div className="cookie-actions">
        <button type="button" onClick={() => save("denied")}>
          Reject marketing
        </button>
        {!optOut && (
          <button type="button" onClick={() => save("granted")}>
            Accept marketing
          </button>
        )}
      </div>
      {open && consent !== "unknown" && (
        <button type="button" className="cookie-close" onClick={close}>
          Close settings
        </button>
      )}
    </section>
  );
}
