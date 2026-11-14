import { ArrowUpRight, Phone } from "lucide-react";
import { business } from "../../data/content";
import { track } from "../../lib/analytics";
export function EstimateButton({
  label = "Get an Estimate",
  location = "page",
  light = false,
}: {
  label?: string;
  location?: string;
  light?: boolean;
}) {
  return (
    <a
      className={`button ${light ? "button-white" : "button-red"}`}
      href="#estimate"
      onClick={() => {
        if (location === "hero") track("hero_cta_click", location);
      }}
    >
      {label}
      <ArrowUpRight size={18} />
    </a>
  );
}
export function CallButton({
  location = "page",
  className = "",
  label,
  sublabel,
}: {
  location?: string;
  className?: string;
  label?: string;
  /** Optional second line, e.g. the phone number under "Call Now". */
  sublabel?: string;
}) {
  return (
    <a
      className={className}
      href={business.tel}
      onClick={() => track("phone_click", location)}
    >
      <Phone size={17} aria-hidden="true" />
      {sublabel ? (
        <span className="call-text">
          <span>{label ?? business.phone}</span>
          <small>{sublabel}</small>
        </span>
      ) : (
        <span>{label ?? business.phone}</span>
      )}
    </a>
  );
}
export function Brand() {
  return (
    <a className="brand" href="#top" aria-label="FWC Plumbing & Rooter home">
      <span className="brand-image">
        <img
          src="/lofwc.jpeg"
          srcSet="/assets/images/fwc-logo-512.webp 512w, /lofwc.jpeg 1536w"
          sizes="(min-width: 1000px) 92px, 72px"
          width="1536"
          height="1024"
          alt="FWC company emblem with flag, cross, hammer and wrench"
        />
      </span>
      <span className="brand-label">
        <strong>
          FWC PLUMBING<span>& ROOTER</span>
        </strong>
        <small>Powered by FWC Companies</small>
      </span>
    </a>
  );
}
