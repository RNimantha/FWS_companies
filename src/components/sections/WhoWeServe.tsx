import {
  ArrowUpRight,
  Home,
  Building2,
  Landmark,
  UsersRound,
} from "lucide-react";
const audiences = [
  {
    name: "Single Family",
    icon: Home,
    text: "Dependable solutions for individual homeowners and residential properties.",
  },
  {
    name: "Multi Family Specialist",
    icon: Building2,
    text: "Professional support for apartments, multi-unit buildings, and residential communities.",
  },
  {
    name: "Commercial & Institutional",
    icon: Landmark,
    text: "Reliable service solutions for commercial properties and institutional facilities.",
  },
  {
    name: "HOA",
    icon: UsersRound,
    text: "Dedicated service for homeowners associations and managed communities.",
  },
];
export function WhoWeServe() {
  return (
    <section id="who-we-serve" className="section who-section">
      <div className="container">
        <div className="section-intro">
          <div>
            <p className="eyebrow">WHO WE SERVE</p>
            <h2>
              Every property is different.
              <br />
              Our commitment stays the same.
            </h2>
          </div>
          <p>
            From the place you call home to the communities and buildings you
            manage.
          </p>
        </div>
        <div className="audience-grid">
          {audiences.map(({ name, icon: Icon, text }, index) => (
            <article className="audience-card" key={name}>
              <span className="audience-number">0{index + 1}</span>
              <Icon size={30} strokeWidth={1.5} aria-hidden="true" />
              <h3>{name}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <a className="text-link" href="#estimate">
          Tell us about your property <ArrowUpRight size={17} />
        </a>
      </div>
    </section>
  );
}
