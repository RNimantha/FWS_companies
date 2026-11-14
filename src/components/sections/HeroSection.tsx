import { ArrowDown, ArrowUpRight, Clock3, MapPin } from "lucide-react";
import { business } from "../../data/content";
import { CallButton, EstimateButton } from "../ui/Actions";
export function HeroSection() {
  return (
    <section className="hero">
      <div className="hero-texture" aria-hidden="true" />
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow">
            <span /> FWC PLUMBING & ROOTER
          </p>
          <h1>
            ONE CALL,
            <br />
            <span>WE DO IT ALL.</span>
          </h1>
          <p className="hero-description">
            Professional plumbing and rooter services for residential,
            multi-family, commercial, and institutional properties.
          </p>
          <div className="hero-actions">
            <EstimateButton location="hero" />
            <CallButton
              location="hero"
              className="hero-call"
              label="Call 714-410-2728"
            />
          </div>
          <div className="hero-proof">
            <span className="availability">
              <Clock3 size={17} />
              24/7 SERVICE
            </span>
            <span>
              <MapPin size={15} />
              Based in Placentia, CA
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <img
            src="/assets/images/fwc-truck-clean.jpg"
            srcSet="/assets/images/fwc-truck-800.webp 800w, /assets/images/fwc-truck-1300.webp 1300w"
            sizes="(min-width: 1000px) 560px, (min-width: 600px) 700px, calc(100vw - 40px)"
            alt="FWC Plumbing & Rooter company truck with black, red and silver branding, service list and 714-410-2728 phone number"
            width="1300"
            height="800"
            fetchPriority="high"
          />
          <div className="photo-label">
            <span className="live-dot" />
            <div>
              <strong>Our name. Our truck. Your team.</strong>
              <span>Powered by FWC Companies</span>
            </div>
            <ArrowUpRight size={20} aria-hidden="true" />
          </div>
        </div>
      </div>
      <div className="hero-bottom container">
        <span>{business.secondarySlogan}</span>
        <a href="#services">
          EXPLORE OUR SERVICES <ArrowDown size={15} />
        </a>
      </div>
    </section>
  );
}
