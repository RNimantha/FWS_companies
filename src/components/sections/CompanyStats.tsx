import { Truck, UsersRound, Clock3, BadgeCheck } from "lucide-react";
import { m } from "motion/react";
import {
  CountUp,
  reveal,
  useRevealKey,
  useRevealVariants,
} from "../../lib/motion";

type Highlight = {
  label: string;
  icon: typeof Truck;
} & ({ count: number; suffix?: string } | { text: string });

const highlights: Highlight[] = [
  { count: 8, label: "Trucks", icon: Truck },
  { count: 12, label: "Employees", icon: UsersRound },
  { count: 24, suffix: "/7", label: "Service", icon: Clock3 },
  { text: "Certified", label: "Technicians", icon: BadgeCheck },
];

// Touch feedback colour: mobile browsers do not reliably apply :active to
// non-interactive elements, so mirror Motion's tap state as an attribute.
// Written straight to the DOM — no React state, no re-render.
const pressedCard = (e: Event) =>
  (e.target as Element | null)?.closest?.(".stat") ?? null;
const setPressed = (e: Event) =>
  pressedCard(e)?.setAttribute("data-pressed", "");
const clearPressed = () =>
  document
    .querySelectorAll(".stat[data-pressed]")
    .forEach((el) => el.removeAttribute("data-pressed"));

export function CompanyStats() {
  const v = useRevealVariants();
  const revealKey = useRevealKey();
  return (
    <section className="company-stats" aria-label="Company highlights">
      <div className="container">
        <dl key={revealKey}>
          {highlights.map((h, i) => (
            <m.div
              className="stat"
              key={h.label}
              variants={v.card}
              {...reveal(i)}
              whileHover="hover"
              whileTap="tap"
              onTapStart={setPressed}
              onTap={clearPressed}
              onTapCancel={clearPressed}
              data-reveal
            >
              <dt>
                <m.span
                  className="stat-icon"
                  variants={v.icon}
                  custom={i}
                  data-reveal
                >
                  <h.icon size={23} strokeWidth={1.6} aria-hidden="true" />
                </m.span>
                {h.label}
              </dt>
              <dd>
                {"count" in h ? (
                  <CountUp to={h.count} suffix={h.suffix} />
                ) : (
                  h.text
                )}
              </dd>
            </m.div>
          ))}
        </dl>
      </div>
    </section>
  );
}
