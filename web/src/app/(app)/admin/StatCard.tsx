"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A dashboard stat tile whose number counts up (eased) the first time it scrolls
 * into view, with an icon, a soft accent glow that intensifies on hover, and a
 * lift on hover. Respects reduced motion (shows the final value immediately).
 */
export function StatCard({
  value,
  label,
  icon,
  suffix = "",
  decimals = 0,
}: {
  value: number;
  label: string;
  icon?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const start = () => {
      if (done.current) return;
      done.current = true;
      const t0 = performance.now();
      const dur = 1100;
      const tick = (now: number) => {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(value * eased);
        if (p < 1) requestAnimationFrame(tick);
        else setDisplay(value);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            start();
            io.disconnect();
          }
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  const shown = decimals
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString("en-US");

  return (
    <div
      ref={ref}
      className="hover-lift group relative overflow-hidden rounded-2xl border border-border bg-card p-5"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent-tint opacity-50 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">
        {icon && (
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-accent-tint text-[17px]">
            {icon}
          </div>
        )}
        <p className="text-[30px] font-extrabold leading-none tracking-[-0.02em] text-text tabular-nums">
          {shown}
          {suffix}
        </p>
        <p className="mt-2 text-xs leading-[1.4] text-dim">{label}</p>
      </div>
    </div>
  );
}
