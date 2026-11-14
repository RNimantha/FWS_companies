import { useEffect, useState } from "react";

/**
 * Returns true only while none of the given elements are on screen.
 * Uses one IntersectionObserver (no scroll listeners). `topOffset` excludes
 * the area under a sticky header, so an element counts as gone once it has
 * scrolled behind the header.
 *
 * Starts as false, so server/prerendered HTML and the first client render
 * agree, and nothing shows until the observer reports.
 */
export function useShowWhenOffscreen(
  selectors: readonly string[],
  topOffset = 0,
) {
  const [visible, setVisible] = useState(false);
  const key = selectors.join("|");

  useEffect(() => {
    const targets = key
      .split("|")
      .map((s) => document.querySelector(s))
      .filter((el): el is Element => el !== null);

    // Very old browsers: show it rather than lose the call-to-action.
    if (!("IntersectionObserver" in window) || targets.length === 0) {
      setVisible(true);
      return;
    }

    const onScreen = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onScreen.add(entry.target);
          else onScreen.delete(entry.target);
        }
        setVisible(onScreen.size === 0);
      },
      { rootMargin: `-${topOffset}px 0px 0px 0px` },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [key, topOffset]);

  return visible;
}
