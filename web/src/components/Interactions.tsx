"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Global interaction layer (renders nothing):
 *  - a ripple "burst" at the pointer on every click (skipped inside text fields)
 *  - scroll-linked parallax for the live aurora background
 *  - scroll-reveal: grid tiles/cards fade + rise as they enter the viewport
 * All disabled when the user prefers reduced motion.
 */
export function Interactions() {
  const pathname = usePathname();

  // Click ripple + aurora parallax — set up once.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onClick = (e: MouseEvent) => {
      const el = e.target;
      if (el instanceof Element && el.closest("input, textarea, select, [contenteditable='true']"))
        return;
      const burst = document.createElement("span");
      burst.className = "click-burst";
      burst.style.left = `${e.clientX}px`;
      burst.style.top = `${e.clientY}px`;
      document.body.appendChild(burst);
      burst.addEventListener("animationend", () => burst.remove());
    };
    document.addEventListener("click", onClick);

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--scroll", String(window.scrollY));
        raf = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Cursor spotlight — feed the pointer position to the CSS glow.
    let lx = 0;
    let ly = 0;
    let mraf = 0;
    const onMove = (e: MouseEvent) => {
      lx = e.clientX;
      ly = e.clientY;
      if (mraf) return;
      mraf = requestAnimationFrame(() => {
        const s = document.documentElement.style;
        s.setProperty("--mx", `${lx}px`);
        s.setProperty("--my", `${ly}px`);
        s.setProperty("--glow-op", "1");
        mraf = 0;
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
      if (mraf) cancelAnimationFrame(mraf);
    };
  }, []);

  // Scroll-reveal — re-scan whenever the route changes.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("sr-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.06, rootMargin: "0px 0px -6% 0px" },
    );

    // Measure after two frames so the page has actually laid out, then hide the
    // below-the-fold tiles so they animate in on scroll. Above-the-fold content
    // keeps its load-cascade.
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const vh = window.innerHeight;
        const nodes = document.querySelectorAll<HTMLElement>(
          "main [class*='grid']:not(.stagger) > *",
        );
        nodes.forEach((node) => {
          if (node.getBoundingClientRect().top <= vh * 0.82) return; // above fold
          node.classList.add("sr");
          const siblings = node.parentElement?.children;
          const idx = siblings ? Array.prototype.indexOf.call(siblings, node) : 0;
          node.style.transitionDelay = `${Math.min(idx * 55, 320)}ms`;
          io.observe(node);
        });
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      io.disconnect();
    };
  }, [pathname]);

  return null;
}
