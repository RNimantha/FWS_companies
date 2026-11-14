import { ArrowUpRight } from "lucide-react";
import { business } from "../../data/content";
export function CredentialsSection() {
  return (
    <section
      id="credentials"
      className="footer-credentials"
      aria-labelledby="credentials-heading"
    >
      <div className="container">
        <div className="section-intro">
          <div>
            <p className="eyebrow">THE PEOPLE BEHIND THE WORK</p>
            <h2 id="credentials-heading">
              Certified technicians.
              <br />A commitment to quality.
            </h2>
          </div>
          <p>
            Professional service backed by trained technicians. Ask our team
            about current credentials relevant to your project.
          </p>
        </div>
        <div className="credential-gallery">
          <a
            className="credential-badge"
            href={business.bbb}
            target="_blank"
            rel="noreferrer"
          >
            <img
              src="/footer/footer1.jpeg"
              width="300"
              height="300"
              loading="lazy"
              alt="FWC-supplied BBB Accredited Business A+ Rating badge"
            />
            <span>
              View BBB business profile <ArrowUpRight size={16} />
            </span>
          </a>
          <figure className="credential-overview">
            <a
              href="/footer/footer2.jpeg"
              target="_blank"
              rel="noreferrer"
              aria-label="Open the full-size FWC credentials overview in a new tab"
            >
              <img
                src="/footer/footer2.jpeg"
                width="1536"
                height="1024"
                loading="lazy"
                alt="FWC company-provided credentials overview: licensed, insured, EPA certified, asbestos certified, general contractor, electrical and plumbing certified, and BBB accredited. Contact FWC for current documentation and applicable guarantee terms."
              />
            </a>
            <figcaption>
              <span>Company-provided credentials overview</span>
              <a href="/footer/footer2.jpeg" target="_blank" rel="noreferrer">
                View full size <ArrowUpRight size={15} />
              </a>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
