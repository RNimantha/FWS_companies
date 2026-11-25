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
            <div className="hero-location">
              <span>
                <MapPin size={15} />
                Based in Placentia, CA
              </span>
              <p className="hero-service-areas">{business.serviceArea}</p>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <img
            src="/assets/images/hero_image/hero.jpg"
            alt="FWC Plumbing & Rooter team standing beside branded service trucks outside the company building"
            width="1600"
            height="1200"
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
        <a href="/services">
          EXPLORE OUR SERVICES <ArrowDown size={15} />
        </a>
      </div>
    </section>
  );
}
