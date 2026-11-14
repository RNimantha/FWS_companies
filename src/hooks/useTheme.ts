import { useSyncExternalStore } from "react";
type Theme = "light" | "dark";
const key = "fwc-theme";
function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(key);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}
function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event("fwc:theme"));
}
function subscribe(update: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const system = () => {
    if (!savedTheme()) apply(media.matches ? "dark" : "light");
  };
  const storage = (event: StorageEvent) => {
    if (event.key === key || event.key === null)
      apply(savedTheme() ?? (media.matches ? "dark" : "light"));
  };
  window.addEventListener("fwc:theme", update);
  window.addEventListener("storage", storage);
  media.addEventListener("change", system);
  return () => {
    window.removeEventListener("fwc:theme", update);
    window.removeEventListener("storage", storage);
    media.removeEventListener("change", system);
  };
}
export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    (): Theme =>
      document.documentElement.dataset.theme === "dark" ? "dark" : "light",
    (): Theme => "light",
  );
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(key, next);
    } catch {
      /* Theme remains usable when storage is unavailable. */
    }
    apply(next);
  }
  return { theme, toggle };
}
