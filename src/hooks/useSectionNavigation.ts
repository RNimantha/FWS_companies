import { useEffect } from "react";

// These paths are section destinations within the existing landing page.
export const sectionPaths: Record<string, string> = {
  "/": "top",
  "/main": "main",
  "/estimate": "estimate",
  "/services": "services",
  "/who-we-serve": "who-we-serve",
  "/why-fwc": "why-fwc",
  "/projects": "projects",
  "/faq": "faq",
  "/financing": "financing",
  "/credentials": "credentials",
  "/privacy": "privacy",
};

export function useSectionNavigation() {
  useEffect(() => {
    let frame = 0;
    function navigate(focus = false) {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      const target = document.getElementById(sectionPaths[path]);
      if (!target) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (target instanceof HTMLDetailsElement) target.open = true;
        if (focus) {
          if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
          target.focus({ preventScroll: true });
        }
        target.scrollIntoView({ block: "start", behavior: "instant" });
      });
    }
    function legacyHash() {
      const entry = Object.entries(sectionPaths).find(
        ([, id]) => `#${id}` === window.location.hash,
      );
      if (!entry) return false;
      history.replaceState(
        history.state,
        "",
        entry[0] + window.location.search,
      );
      return true;
    }
    function click(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !link ||
        link.hasAttribute("download") ||
        (link.target && link.target !== "_self")
      )
        return;
      const url = new URL(link.href);
      const path = url.pathname.replace(/\/$/, "") || "/";
      if (url.origin !== location.origin || url.hash || !sectionPaths[path])
        return;
      event.preventDefault();
      const destination = path + (url.search || location.search);
      if (location.pathname + location.search !== destination || location.hash)
        history.pushState(null, "", destination);
      navigate(true);
    }
    function restore() {
      legacyHash();
      navigate();
    }
    const oldScrollRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    const legacy = legacyHash();
    if (legacy || location.pathname !== "/") navigate();
    document.addEventListener("click", click);
    window.addEventListener("popstate", restore);
    window.addEventListener("hashchange", restore);
    return () => {
      cancelAnimationFrame(frame);
      history.scrollRestoration = oldScrollRestoration;
      document.removeEventListener("click", click);
      window.removeEventListener("popstate", restore);
      window.removeEventListener("hashchange", restore);
    };
  }, []);
}
