import { ArrowRight, Check, Phone, Plus } from "lucide-react";
import { services, business, problems } from "../../data/content";

type Service = (typeof services)[number];

const FEATURED = ["plumbing", "electrical", "hvac"];
const SPECIALTY = ["drains", "sewer", "trenchless"];
const VISIBLE_ITEMS = 3;

const byIds = (ids: string[]) =>
  ids
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s));

const ctaLabel: Record<string, string> = {
  plumbing: "Get a plumbing estimate",
  electrical: "Get an electrical estimate",
  hvac: "Get an HVAC estimate",
  drains: "Get a drain estimate",
  sewer: "Get a sewer estimate",
  trenchless: "Get a trenchless estimate",
};

function ItemList({ items }: { items: string[] }) {
  const shown = items.slice(0, VISIBLE_ITEMS);
  const rest = items.slice(VISIBLE_ITEMS);
  return (
    <>
      <ul className="svc-list">
        {shown.map((item) => (
          <li key={item}>
            <Check size={15} aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
      {rest.length > 0 && (
        <details className="svc-more">
          <summary>
            <Plus size={14} aria-hidden="true" />
            {rest.length} more
          </summary>
          <ul className="svc-list">
            {rest.map((item) => (
              <li key={item}>
                <Check size={15} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function ServiceCard({
  service: s,
  onSelect,
  badge,
  compact = false,
}: {
  service: Service;
  onSelect: (id: string) => void;
  badge?: string;
  compact?: boolean;
}) {
  const Heading = compact ? "h4" : "h3";
  return (
    <article
      className={`svc-card svc-card--${s.id}${compact ? " svc-card--compact" : ""}`}
      aria-labelledby={`svc-${s.id}`}
    >
      <div className="svc-cover">
        {s.image && (
          <img
            src={s.image.src}
            alt={s.image.alt}
            width={s.image.width}
            height={s.image.height}
            style={{ objectPosition: s.image.position }}
            loading="lazy"
            decoding="async"
          />
        )}
        {badge && <span className="svc-badge">{badge}</span>}
        <div className="svc-cover-text">
          <span className="svc-icon">
            <s.icon
              size={compact ? 21 : 23}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </span>
          <Heading id={`svc-${s.id}`}>{s.name}</Heading>
          <p>{s.summary}</p>
        </div>
      </div>
      <div className="svc-body">
        <ItemList items={s.items} />
        <a href="#estimate" className="svc-cta" onClick={() => onSelect(s.id)}>
          {ctaLabel[s.id]}
          <ArrowRight size={17} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

export function ServicesSection({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const featured = byIds(FEATURED);
  const specialty = byIds(SPECIALTY);
  const emergency = services.find((s) => s.id === "emergency");

  const chip = (p: (typeof problems)[number], hidden = false) => (
    <li key={`${p.label}${hidden ? "-dup" : ""}`}>
      <a
        href="#estimate"
        className="svc-chip"
        onClick={() => onSelect(p.service)}
        tabIndex={hidden ? -1 : undefined}
      >
        {p.label}
        <ArrowRight size={14} aria-hidden="true" />
      </a>
    </li>
  );

  return (
    <section
      id="services"
      className="section services"
      aria-labelledby="services-title"
    >
      <div className="container">
        <div className="section-intro">
          <div>
            <p className="eyebrow">OUR SERVICES</p>
            <h2 id="services-title">
              Plumbing, electrical
              <br />
              &amp; HVAC. One call.
            </h2>
          </div>
          <p>
            Plumbing is our specialty. Tell us what’s going on and we’ll point
            you to the right next step.
          </p>
        </div>
      </div>

      {/* Problem-first ticker: tap a symptom to preselect the estimate form */}
      <div className="svc-ticker" aria-label="Common problems we fix">
        <p className="svc-ticker-label container">What’s going on?</p>
        <div className="svc-ticker-viewport">
          <ul className="svc-ticker-track">
            {problems.map((p) => chip(p))}
            {/* Duplicate set makes the loop seamless; hidden from AT/keyboard */}
            <li className="svc-ticker-dup" aria-hidden="true">
              <ul>{problems.map((p) => chip(p, true))}</ul>
            </li>
          </ul>
        </div>
      </div>

      <div className="container">
        {emergency && (
          <div className="svc-emergency">
            <div className="svc-emergency-copy">
              <span className="svc-live">
                <span className="svc-live-dot" aria-hidden="true" />
                24/7 service
              </span>
              <h3>Leak, power failure or no heat?</h3>
              <p>
                {emergency.summary} Call to discuss your situation and
                availability.
              </p>
            </div>
            <a href={business.tel} className="svc-emergency-call">
              <Phone size={18} aria-hidden="true" />
              <span>
                <small>Call now</small>
                {business.phone}
              </span>
            </a>
          </div>
        )}

        <div className="svc-featured">
          {featured.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              onSelect={onSelect}
              badge={s.id === "plumbing" ? "Our specialty" : undefined}
            />
          ))}
        </div>

        <div className="svc-specialty-head">
          <h3>Drain, sewer &amp; pipe specialists</h3>
          <span className="svc-swipe" aria-hidden="true">
            Swipe <ArrowRight size={14} />
          </span>
        </div>
        <div className="svc-specialty" role="list">
          {specialty.map((s) => (
            <div role="listitem" key={s.id}>
              <ServiceCard service={s} onSelect={onSelect} compact />
            </div>
          ))}
        </div>

        <div className="svc-help">
          <div>
            <p className="eyebrow">NOT SURE WHERE TO START?</p>
            <h3>Let’s talk it through.</h3>
          </div>
          <a href={business.tel} className="button button-red">
            <Phone size={17} aria-hidden="true" />
            {business.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
