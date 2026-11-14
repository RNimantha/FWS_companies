import { ArrowUpRight, ChevronDown } from "lucide-react";
import { CredentialsSection } from "../sections/CredentialsSection";
import { business } from "../../data/content";
import { Brand, EstimateButton } from "../ui/Actions";
export function Footer() {
  return (
    <footer>
      <CredentialsSection />
      <div className="container">
        <div className="footer-grid">
          <div>
            <Brand />
            <p className="footer-slogan">{business.slogan}</p>
            <p>
              Plumbing & rooter expertise.
              <br />
              Powered by FWC Companies.
            </p>
          </div>
          <div>
            <h3>Let’s connect</h3>
            <a href={business.tel}>{business.phone}</a>
            <a href={`mailto:${business.email}`}>{business.email}</a>
            <span>24/7 Service</span>
            <a href={business.website}>
              fwccompanies.com <ArrowUpRight size={13} />
            </a>
          </div>
          <div>
            <h3>Find us</h3>
            <address>{business.address}</address>
            <p>Call with your ZIP code to confirm service availability.</p>
          </div>
          <div>
            <h3>Explore</h3>
            <a href="#services">Our services</a>
            <a href="#who-we-serve">Who we serve</a>
            <a href="#projects">Our work</a>
            <a href="#credentials">Credentials</a>
            <a
              href="https://www.instagram.com/fwccompaniesllc/"
              target="_blank"
              rel="noreferrer"
            >
              Instagram <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
        <div className="footer-action">
          <span>Let’s get your next project moving.</span>
          <EstimateButton />
        </div>
        <details id="privacy" className="privacy">
          <summary>
            Privacy information <ChevronDown size={14} />
          </summary>
          <p>
            Contact information provided to {business.name} is used to respond
            to service inquiries. Please do not include sensitive information in
            messages. For questions about your information, contact{" "}
            {business.email}. For urgent assistance, please call our team.
          </p>
        </details>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} FWC LLC. All rights reserved.
          </span>
          <span>FWC PLUMBING & ROOTER</span>
        </div>
      </div>
    </footer>
  );
}
