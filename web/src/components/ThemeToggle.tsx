"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("autobd-app-theme", next);
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
