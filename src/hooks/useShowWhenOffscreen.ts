import { useEffect, useState } from "react";

/** Starts hidden for SSR. Observe content below the complete sticky header. */
export function useShowWhenOffscreen(
  selectors: readonly string[],
  topOffset: number | "header" = 0,
) {
  const [visible, setVisible] = useState(false);
  const key = selectors.join("|");
  useEffect(() => {
    const targets = key
      .split("|")
      .map((s) => document.querySelector(s))
      .filter((el): el is Element => el !== null);
    if (!("IntersectionObserver" in window) || targets.length === 0) {
      setVisible(true);
      return;
    }
    // Exclude the expandable menu from the permanent header measurement.
    const headerParts =
      topOffset === "header"
        ? [
            document.querySelector("header .financing-banner"),
            document.querySelector("header .header-inner"),
          ].filter((el): el is Element => el !== null)
        : [];
    const onScreen = new Set<Element>();
    let observer: IntersectionObserver;
    function observe() {
      observer?.disconnect();
      onScreen.clear();
      const offset =
        topOffset === "header"
          ? Math.ceil(
              headerParts.reduce(
                (sum, el) => sum + el.getBoundingClientRect().height,
                0,
              ),
            ) + 1
          : topOffset;
      if (topOffset === "header")
        document.documentElement.style.setProperty(
          "--site-header-height",
          `${offset}px`,
        );
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) onScreen.add(entry.target);
            else onScreen.delete(entry.target);
          }
          setVisible(onScreen.size === 0);
        },
        { rootMargin: `-${offset}px 0px 0px 0px` },
      );
      targets.forEach((target) => observer.observe(target));
    }
    observe();
    const resize =
      headerParts.length && "ResizeObserver" in window
        ? new ResizeObserver(observe)
        : null;
    headerParts.forEach((part) => resize?.observe(part));
    window.addEventListener("resize", observe);
    return () => {
      observer.disconnect();
      resize?.disconnect();
      window.removeEventListener("resize", observe);
    };
  }, [key, topOffset]);
  return visible;
}
