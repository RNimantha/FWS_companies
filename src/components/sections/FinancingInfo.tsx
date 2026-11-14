import { ArrowUpRight, CreditCard } from "lucide-react";
export function FinancingInfo() {
  return (
    <aside
      id="financing"
      className="financing-info"
      aria-labelledby="financing-heading"
    >
      <CreditCard size={24} strokeWidth={1.6} aria-hidden="true" />
      <div>
        <p className="eyebrow">WE OFFER FINANCING</p>
        <h3 id="financing-heading">
          Plan your project.
          <br />
          Explore your options.
        </h3>
        <p>
          Ask our team about available financing options and the current terms
          for your project.
        </p>
        <a className="text-link" href="#estimate">
          Ask about financing <ArrowUpRight size={17} />
        </a>
      </div>
    </aside>
  );
}
