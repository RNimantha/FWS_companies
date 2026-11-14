import { useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Clock3,
  MapPin,
  Wrench,
  Building2,
  Truck,
  Layers3,
} from "lucide-react";
import { HeroSection } from "./components/sections/HeroSection";
import { CompanyStats } from "./components/sections/CompanyStats";
import { WhoWeServe } from "./components/sections/WhoWeServe";
import { FinancingInfo } from "./components/sections/FinancingInfo";
import { Footer } from "./components/layout/Footer";
import { Header } from "./components/layout/Header";
import { StickyConversionBar } from "./components/layout/StickyConversionBar";
import { CallButton, EstimateButton } from "./components/ui/Actions";
import { ServicesSection } from "./components/sections/Services";
import { LeadForm } from "./components/forms/LeadForm";
import { faqs } from "./data/content";
import { MotionProvider } from "./lib/motion";
export default function App() {
  const [selected, setSelected] = useState("");
  return (
    <MotionProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div id="top" />
      <Header />
      <main id="main">
        <HeroSection />
        <CompanyStats />
        <ServicesSection onSelect={setSelected} />
        <WhoWeServe />
        <section id="why-fwc" className="section why-section">
          <div className="container why-grid">
            <div className="why-image">
              <img
                src="/assets/images/work.webp"
                loading="lazy"
                width="720"
                height="480"
                alt="Electrical panels and organized wiring from the existing FWC work gallery"
              />
              <div className="image-caption">
                <span>THE DETAILS MAKE THE DIFFERENCE.</span>
                <p>
                  Practical expertise.
                  <br />
                  From the inside out.
                </p>
              </div>
            </div>
            <div className="why-copy">
              <p className="eyebrow">THE FWC APPROACH</p>
              <h2>WE HANDLE PROBLEMS OTHERS CAN'T FIGURE OUT</h2>
              <p>
                FWC Plumbing & Rooter brings practical expertise to repairs,
                installations, and the unexpected. Powered by FWC Companies, our
                team also provides electrical and HVAC services for your
                property.
              </p>
              <div className="benefit">
                <Building2 />
                <div>
                  <h3>We understand your property.</h3>
                  <p>
                    Residential and multifamily experience, from an individual
                    unit to a larger project.
                  </p>
                </div>
              </div>
              <div className="benefit">
                <Truck />
                <div>
                  <h3>Equipped for the work.</h3>
                  <p>
                    Stocked inventory across trades to support the job at hand.
                  </p>
                </div>
              </div>
              <div className="benefit">
                <Layers3 />
                <div>
                  <h3>More solutions. Less juggling.</h3>
                  <p>
                    Plumbing, electrical, HVAC, and drain expertise in one
                    place.
                  </p>
                </div>
              </div>
              <a className="text-link" href="#estimate">
                Let’s discuss your project <ArrowUpRight size={17} />
              </a>
            </div>
          </div>
        </section>
        <section id="projects" className="section projects">
          <div className="container">
            <div className="section-intro">
              <div>
                <p className="eyebrow">A CLOSER LOOK</p>
                <h2>Real work. Real attention to detail.</h2>
              </div>
              <a className="text-link" href="#estimate">
                Have a project in mind? <ArrowUpRight size={17} />
              </a>
            </div>
            <article className="project-case">
              <figure className="project-case-photo">
                <img
                  src="/assets/images/water-heater-project.webp"
                  width="338"
                  height="600"
                  loading="lazy"
                  alt="Sediment around the internal tubes of a commercial water heater, from FWC’s published Ontario clean-out project"
                />
                <figcaption>
                  Tank interior from our Ontario water-heater project.
                </figcaption>
              </figure>
              <div className="project-story">
                <span className="eyebrow">PROJECT SPOTLIGHT · ONTARIO, CA</span>
                <Wrench size={37} strokeWidth={1.3} />
                <h3>A fresh start for a hard-working water heater.</h3>
                <p>
                  FWC’s July 2026 commercial project involved cleaning out a
                  100-gallon water heater: removing sediment, flushing the tank,
                  relighting, and checking for leaks.
                </p>
                <div className="project-tags">
                  <span>Commercial plumbing</span>
                  <span>Maintenance</span>
                </div>
                <a
                  className="text-link"
                  href="#estimate"
                  onClick={() => setSelected("plumbing")}
                >
                  Discuss a similar project <ArrowUpRight size={17} />
                </a>
              </div>{" "}
            </article>
          </div>
        </section>
        <section className="section process">
          <div className="container">
            <p className="eyebrow">FROM “WHAT NOW?” TO WHAT’S NEXT.</p>
            <h2>Getting help should be simple.</h2>
            <div className="steps">
              {[
                [
                  "01",
                  "Tell us what’s happening.",
                  "Call for urgent help or send an estimate request with a few details.",
                ],
                [
                  "02",
                  "Let’s talk through the details.",
                  "Discuss your location, service needs, and current availability with our team.",
                ],
                [
                  "03",
                  "Plan the next step.",
                  "Work with FWC to arrange the appropriate service for your property.",
                ],
              ].map(([n, h, p]) => (
                <div className="step" key={n}>
                  <span>{n}</span>
                  <h3>{h}</h3>
                  <p>{p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="estimate" className="section contact-section">
          <div className="container contact-grid">
            <div className="contact-copy">
              <p className="eyebrow">LET’S TAKE IT FROM HERE.</p>
              <h2>
                One less thing
                <br />
                on your list.
              </h2>
              <p>
                Tell us what your property needs. From everyday repairs to
                bigger plans, start a conversation with FWC.
              </p>
              <div className="contact-urgent">
                <Clock3 size={22} />
                <div>
                  <strong>Need help right now?</strong>
                  <p>For emergencies, give us a call.</p>
                  <CallButton location="form" />
                </div>
              </div>
              <div className="contact-location">
                <MapPin size={19} />
                <p>
                  <strong>Based in Placentia, California</strong>
                  <br />
                  Call with your ZIP code to confirm service availability.
                </p>
              </div>
              <FinancingInfo />
            </div>
            <div className="form-card">
              <LeadForm selected={selected} />
            </div>
          </div>
        </section>
        <section id="faq" className="section faq-section">
          <div className="container faq-grid">
            <div>
              <p className="eyebrow">A LITTLE CLARITY</p>
              <h2>
                Good questions.
                <br />
                Straight answers.
              </h2>
              <p>Still have something on your mind?</p>
              <CallButton location="faq" className="text-link" />
            </div>
            <div className="faq-list">
              {faqs.map(([q, a]) => (
                <details key={q}>
                  <summary>
                    {q}
                    <ChevronDown size={18} />
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section className="final-cta">
          <div className="container">
            <div>
              <p className="eyebrow">YOUR NEXT STEP STARTS HERE.</p>
              <h2>
                Let’s get your property
                <br />
                back to its best.
              </h2>
            </div>
            <EstimateButton />
            <CallButton location="final" className="final-phone" />
          </div>
        </section>
      </main>
      <Footer />
      <StickyConversionBar />
    </MotionProvider>
  );
}
