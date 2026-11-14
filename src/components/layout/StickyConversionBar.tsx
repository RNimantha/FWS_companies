import { ArrowUpRight } from "lucide-react";
import { business } from "../../data/content";
import { useShowWhenOffscreen } from "../../hooks/useShowWhenOffscreen";
import { CallButton } from "../ui/Actions";

/**
 * Hidden while the hero (which has its own CTAs) or the estimate form is on
 * screen; shown everywhere else. Height of the sticky header is excluded so
 * the hero counts as gone once it scrolls under the header.
 */
const HIDE_WHILE_VISIBLE = [".hero", "#estimate"] as const;

export function StickyConversionBar() {
  const visible = useShowWhenOffscreen(HIDE_WHILE_VISIBLE, "header");

  return (
    <aside
      className="smart-bar"
      data-visible={visible}
      aria-label="Call or request an estimate"
      inert={!visible}
    >
      <div className="smart-bar-inner">
        <div className="smart-bar-copy">
          <p className="smart-bar-title">
            ONE CALL, <span>WE DO IT ALL.</span>
          </p>
          <p className="smart-bar-sub">24/7 Plumbing &amp; Rooter Services</p>
        </div>
        <div className="smart-bar-actions">
          <CallButton
            location="sticky"
            className="smart-bar-call"
            label="Call Now"
            sublabel={business.phone}
          />
          <a className="smart-bar-estimate" href="#estimate">
            Get an Estimate
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </div>
      </div>
    </aside>
  );
}
