import { openMarketingPreferences } from "../../lib/marketing-consent";
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
              Plumbing & Rooter expertise.
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
            <a href="/services">Our services</a>
            <a href="/who-we-serve">Who we serve</a>
            <a href="/projects">Our work</a>
            <a href="/credentials">Credentials</a>
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
            Privacy and cookie information <ChevronDown size={14} />
          </summary>
          <p>
            Contact information provided to {business.name} is used to respond
            to service inquiries. Please do not include sensitive information in
            messages. For questions about your information, contact{" "}
            {business.email}. For urgent assistance, please call our team.
          </p>
          <p>
            Marketing cookies are optional. If you accept marketing, we load
            Meta Pixel to measure advertising, record website visits,
            estimate-button clicks, phone-link clicks, form starts and confirmed
            estimate requests, and support relevant advertising and remarketing.
            Phone clicks do not confirm a completed call.
          </p>
          <p>
            Meta may receive your IP address, browser/device information, page
            URL, referrer and cookie identifiers, including _fbp and, when
            applicable, _fbc. Our event parameters do not include your name,
            email address, phone number, form message or other form values. We
            do not enable advanced matching in this integration.
          </p>
          <p>
            We remember your cookie choice in this browser for up to 180 days.
            Meta advertising cookie lifetimes depend on Meta and your browser;
            see Meta’s Cookie Policy for details. Rejecting marketing keeps the
            form and phone links working. Use Cookie settings below to change or
            withdraw consent at any time. Withdrawal stops future events and
            clears accessible Meta cookies on this site; it does not undo data
            already sent. Browser Global Privacy Control signals disable
            marketing tracking.
          </p>
          <p>
            Learn how Meta uses this data in its{" "}
            <a
              href="https://www.facebook.com/privacy/policy/"
              target="_blank"
              rel="noreferrer"
            >
              Privacy Policy
            </a>{" "}
            and{" "}
            <a
              href="https://www.facebook.com/policies/cookies/"
              target="_blank"
              rel="noreferrer"
            >
              Cookie Policy
            </a>
            . Contact {business.email} with privacy questions or requests.
          </p>
        </details>
        <button
          type="button"
          className="cookie-settings"
          onClick={openMarketingPreferences}
        >
          Cookie settings
        </button>
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
