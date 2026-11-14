import { ArrowUpRight, Check, ChevronDown, Phone } from "lucide-react";
import { services, business } from "../../data/content";
export function ServicesSection({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  return (
    <section id="services" className="section services">
      <div className="container">
        <div className="section-intro">
          <div>
            <p className="eyebrow">OUR SERVICES</p>
            <h2>
              Plumbing is our specialty.
              <br />
              Solutions are what we do.
            </h2>
          </div>
          <p>
            From rooter and drain blockages to plumbing installations, plus the
            electrical and HVAC services your property needs.
          </p>
        </div>
        <div className="service-grid">
          {services.map((s, i) => (
            <article
              className={`service-card ${s.id === "emergency" ? "emergency-card" : ""}`}
              key={s.id}
            >
              <div className="service-top">
                <span className="service-icon">
                  <s.icon size={25} strokeWidth={1.6} />
                </span>
                <span className="card-number">0{i + 1}</span>
              </div>
              <h3>{s.name}</h3>
              <p>{s.summary}</p>
              <details>
                <summary>
                  Explore services <ChevronDown size={15} />
                </summary>
                <ul>
                  {s.items.map((item) => (
                    <li key={item}>
                      <Check size={14} />
                      {item}
                    </li>
                  ))}
                </ul>
              </details>
              <a
                href="#estimate"
                className="text-link"
                onClick={() => onSelect(s.id)}
              >
                Request an estimate <ArrowUpRight size={17} />
              </a>
            </article>
          ))}
          <article className="service-help">
            <span className="eyebrow">NOT SURE WHERE TO START?</span>
            <h3>
              Let’s talk
              <br />
              it through.
            </h3>
            <p>Tell us what’s happening. We’ll help you find the next step.</p>
            <a href={business.tel}>
              <Phone size={17} />
              {business.phone}
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}
