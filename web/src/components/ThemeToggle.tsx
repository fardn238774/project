"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "autobd-app-theme";

/**
 * data-theme on <html> is the source of truth — the inline script in the root
 * layout sets it before paint, so it is an external store rather than React
 * state. Subscribing keeps the toggle correct even if the theme is changed
 * elsewhere.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

const getSnapshot = (): Theme =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

// The server has no DOM; the root layout renders data-theme="light" to match.
const getServerSnapshot = (): Theme => "light";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable — theme still applies for this session
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative h-[27px] w-[52px] shrink-0 rounded-full border border-[rgba(120,120,120,0.3)] bg-[linear-gradient(90deg,#0a0a0a_50%,#f3f2ee_50%)]"
    >
      <span
        className="absolute top-[2px] h-[21px] w-[21px] rounded-full bg-accent shadow-[0_2px_6px_rgba(0,0,0,0.35)] transition-[left] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ left: theme === "dark" ? "3px" : "28px" }}
      />
    </button>
  );
}
