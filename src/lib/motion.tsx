import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import {
  LazyMotion,
  MotionConfig,
  useInView,
  useReducedMotion,
  type Variants,
} from "motion/react";

const loadFeatures = () =>
  import("./motion-features").then((mod) => mod.default);

/**
 * App-wide motion setup.
 * - LazyMotion + domAnimation keeps the bundle small; `strict` forbids the
 *   heavier `motion.*` components so only `m.*` can be used.
 * - reducedMotion="user" makes Motion drop transform animations when the OS
 *   "reduce motion" setting is on; the variants below also skip fades.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

const noopSubscribe = () => () => {};

/**
 * Key for animated containers: "ssr" during prerender + hydration, "client"
 * right after. The prerendered HTML stays fully visible (no-JS, SEO), and the
 * key change remounts only the animated containers so Motion can apply their
 * hidden start state before they scroll into view. React does not patch
 * styles during hydration, so without this the entrance never plays.
 */
export function useRevealKey() {
  return useSyncExternalStore(
    noopSubscribe,
    () => "client",
    () => "ssr",
  );
}

const EASE = [0.22, 1, 0.36, 1] as const;

/** Play once, when ~20% of the element is visible. */
export const viewportOnce = { once: true, amount: 0.2 } as const;

const STILL: Variants = { hidden: { opacity: 1 }, show: { opacity: 1 } };

/** Stagger step between siblings, driven by the `custom` index prop. */
const STEP = 0.09;

const variants = {
  item: {
    hidden: { opacity: 0, y: 28 },
    show: (i: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: EASE, delay: i * STEP },
    }),
  },
  card: {
    hidden: { opacity: 0, y: 36 },
    show: (i: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.65, ease: EASE, delay: i * STEP },
    }),
    hover: { y: -5, transition: { duration: 0.25, ease: EASE } },
  },
  icon: {
    hidden: { opacity: 0, scale: 0.6, rotate: -14 },
    show: (i: number = 0) => ({
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 15,
        delay: 0.2 + i * STEP,
      },
    }),
    hover: {
      rotate: [0, -10, 8, 0],
      scale: 1.08,
      transition: { duration: 0.5, ease: "easeInOut" },
    },
  },
} satisfies Record<string, Variants>;

/**
 * Props for an element that reveals itself once when it scrolls into view.
 * Each element observes its own visibility (a child with its own gesture
 * labels, such as whileHover, does not inherit a parent's whileInView).
 * Pass the sibling index so neighbours entering together are staggered.
 */
export function reveal(index = 0) {
  return {
    initial: "hidden",
    whileInView: "show",
    viewport: viewportOnce,
    custom: index,
  } as const;
}

/** Entrance variants, or no-op variants when the user prefers reduced motion. */
export function useRevealVariants() {
  const reduce = useReducedMotion();
  if (!reduce) return variants;
  return { item: STILL, card: STILL, icon: STILL };
}

/**
 * Counts from 0 to `to` the first time it scrolls into view.
 * The visible digits are aria-hidden; screen readers and crawlers get the
 * final value straight away. Updates write to the DOM directly (no state)
 * so counting does not re-render React every frame.
 */
export function CountUp({
  to,
  suffix = "",
  duration = 1.4,
}: {
  to: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const final = `${to}${suffix}`;

  // Reset to 0 after hydration so the count starts from zero when it appears.
  useEffect(() => {
    if (!reduce && ref.current) ref.current.textContent = `0${suffix}`;
  }, [reduce, suffix]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = final;
      return;
    }
    if (!inView) return;
    // Small rAF tween with ease-out-quart; avoids pulling in Motion's
    // standalone animate() engine just for a number.
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - (1 - t) ** 4;
      el.textContent = `${Math.round(eased * to)}${suffix}`;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduce, to, suffix, duration, final]);

  return (
    <>
      <span className="sr-only">{final}</span>
      <span ref={ref} aria-hidden="true" className="count-up">
        {final}
      </span>
    </>
  );
}
