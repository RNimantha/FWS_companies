import { Truck, UsersRound, Clock3, BadgeCheck } from "lucide-react";
const highlights = [
  { value: "8", label: "Trucks", icon: Truck },
  { value: "12", label: "Employees", icon: UsersRound },
  { value: "24/7", label: "Service", icon: Clock3 },
  { value: "Certified", label: "Technicians", icon: BadgeCheck },
];
export function CompanyStats() {
  return (
    <section className="company-stats" aria-label="Company highlights">
      <div className="container">
        <dl>
          {highlights.map(({ value, label, icon: Icon }) => (
            <div className="stat" key={label}>
              <Icon size={23} strokeWidth={1.6} aria-hidden="true" />
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
