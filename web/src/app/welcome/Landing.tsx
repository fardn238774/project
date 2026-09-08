"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { bdt, jpy } from "@/lib/format";

/**
 * The AutoBD landing page — a faithful port of the "AutoBD Landing" design comp,
 * modernised with extra motion. Keeps its signature pieces: the full-bleed car
 * photo that zooms out on scroll and swaps between a dark and a light shot with
 * the theme, plus the marquee, the live landed-cost ticker, the reveal-on-scroll
 * cards, the expanding-ring CTA and the car gallery. Added on top: a scroll
 * progress bar, a staggered hero entrance with a shimmering headline + scroll
 * cue, an animated count-up stats strip, a dual-direction marquee with faded
 * edges, a popping live total, and richer gallery hover. Colours come from the
 * app's own theme tokens (coral in light, lime in dark). All motion respects
 * prefers-reduced-motion.
 */

const MARQUEE = [
  "Toyota Harrier", "Honda Vezel", "Toyota Axio", "Mazda CX-5", "Nissan X-Trail",
  "Toyota Premio", "Suzuki Swift", "Mitsubishi Xpander", "Honda City e:HEV", "Toyota Corolla Cross",
];

const STATS = [
  { target: 12480, suffix: "+", label: "Cars imported" },
  { target: 4, suffix: "", label: "Ways to buy" },
  { target: 100, suffix: "%", label: "Ownership-checked" },
  { target: 30, suffix: "%", label: "Avg shipping saved" },
];

const STEPS = [
  { n: "1", title: "Choose your pillar", desc: "New, used, import, or modification." },
  { n: "2", title: "Pick a verified partner", desc: "License-checked agents, verified sellers." },
  { n: "3", title: "Bid or buy", desc: "Cost updates live as the deal moves." },
  { n: "4", title: "Track to your door", desc: "Escrow payment, live shipment tracking." },
];

const TESTIMONIALS = [
  { quote: "Landed cost matched what I paid at customs, to the taka.", name: "Rafiul H.", role: "Buyer, Dhaka" },
  { quote: "Container pooling saved me ~28% on shipping.", name: "Nusrat J.", role: "Buyer, Chattogram" },
  { quote: "Live bidding with my agent felt like being in Japan.", name: "Tanvir A.", role: "Buyer, Sylhet" },
];

const GALLERY = [
  { src: "/landing/gallery-3.jpg", label: "Porsche 911 · classic livery", big: true },
  { src: "/landing/gallery-1.jpg", label: "Porsche GT3 · track-ready" },
  { src: "/landing/gallery-2.jpg", label: "Genesis Magma GT3 concept" },
  { src: "/landing/gallery-4.jpg", label: "Restomod 911 · Safari green" },
  { src: "/landing/gallery-5.jpg", label: "GT3 RS · track livery" },
];

const comma = (n: number) => n.toLocaleString("en-US");

export function Landing({
  loggedIn,
  primaryHref,
  primaryLabel,
}: {
  loggedIn: boolean;
  primaryHref: string;
  primaryLabel: string;
}) {
  const [scrollY, setScrollY] = useState(0);
  const [progress, setProgress] = useState(0);
  const [bidJpy, setBidJpy] = useState(685_000);
  const [rate, setRate] = useState(0.79);
  const [flash, setFlash] = useState(false);
  const [auctions, setAuctions] = useState(214);
  const [statP, setStatP] = useState(0);
  const statsRef = useRef<HTMLDivElement>(null);

  // Hero parallax + scroll progress bar.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(0);
      return;
    }
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setScrollY(y);
        setProgress(max > 0 ? Math.min(1, y / max) : 0);
        raf = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Live landed-cost ticker + auctions counter (same shape as the real engine).
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setRate(+(0.79 + (Math.random() - 0.5) * 0.004).toFixed(4));
      setAuctions((a) => Math.max(180, Math.min(260, a + (Math.random() < 0.5 ? -1 : 1))));
      if (Math.random() < 0.3) {
        setBidJpy((b) => b + 5000 + Math.floor(Math.random() * 15000));
        setFlash(true);
        setTimeout(() => setFlash(false), 700);
      }
    }, 1600);
    return () => clearInterval(id);
  }, []);

  // Count-up stats when the strip scrolls into view.
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStatP(1);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const dur = 1500;
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / dur);
          setStatP(1 - Math.pow(1 - p, 3));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const heroScale = Math.min(1.22, 1 + scrollY * 0.00025);
  const heroFade = Math.max(0, 1 - scrollY / 420);
  const heroShift = Math.round(scrollY * 0.15);

  const bidBdt = bidJpy * rate;
  const shipping = 195_000;
  const duty = (bidBdt + shipping) * 0.3;
  const agentFee = bidBdt * 0.03;
  const port = 42_000;
  const total = bidBdt + duty + shipping + agentFee + port;
  const barPct = Math.min(96, 30 + ((bidJpy - 685_000) / 400_000) * 66);

  return (
    <div className="relative w-full overflow-clip">
      <style>{LANDING_CSS}</style>

      {/* scroll progress bar */}
      <div className="fixed left-0 top-0 z-40 h-[3px] bg-accent" style={{ width: `${(progress * 100).toFixed(2)}%` }} aria-hidden />

      {/* decorative liquid blobs (accent glow) */}
      <div className="lp-blob lp-blob-a" aria-hidden />
      <div className="lp-blob lp-blob-b" aria-hidden />

      {/* ---- nav ---- */}
      <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-border px-6 py-3.5 sm:px-10">
        <span className="text-[22px] font-extrabold tracking-[-0.02em] text-text">
          Auto<span className="text-accent">BD</span>
        </span>
        <nav className="hidden items-center gap-6 md:flex">
          <a href="#pillars" className="text-[13.5px] font-medium text-muted transition hover:text-text">Pillars</a>
          <a href="#how" className="text-[13.5px] font-medium text-muted transition hover:text-text">How it works</a>
          <a href="#trust" className="text-[13.5px] font-medium text-muted transition hover:text-text">Trust</a>
          <a href="#gallery" className="text-[13.5px] font-medium text-muted transition hover:text-text">Gallery</a>
        </nav>
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Link
            href={primaryHref}
            className="group inline-flex items-center gap-2.5 rounded-full border border-border bg-card py-1 pl-4 pr-1 text-[13px] font-bold text-text transition hover:border-accent"
          >
            {loggedIn ? "Enter app" : "Log in"}
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[13px] text-on-accent transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </header>

      {/* ---- hero (full-bleed car photo, zoom-on-scroll, theme-swapped) ---- */}
      <section className="relative overflow-hidden" style={{ height: "min(760px, 82vh)", minHeight: 480 }}>
        <div className="lp-hero-imgwrap" style={{ transform: `scale(${heroScale.toFixed(4)})` }}>
          <div className="lp-hero-img lp-hero-light" />
          <div className="lp-hero-img lp-hero-dark" />
        </div>
        <div className="lp-hero-overlay" />
        <div className="lp-hero-overlay-side" />
        <span
          className="absolute right-[14%] top-[46%] h-3.5 w-3.5 rounded-full bg-accent"
          style={{ animation: "lpDotBreathe 2.2s ease-in-out infinite" }}
          aria-hidden
        />

        <div
          className="absolute bottom-14 w-full px-6 sm:px-14"
          style={{ opacity: heroFade.toFixed(3), transform: `translateY(${heroShift}px)` }}
        >
          <p className="lp-rise mb-4 inline-flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-accent" style={{ animationDelay: "0.05s" }}>
            <span className="bg-accent" style={{ width: 18, height: 2 }} /> Car Marketplace · Bangladesh
          </p>
          <h1 className="lp-rise max-w-[820px] text-[30px] font-extrabold leading-[1.08] tracking-[-0.03em] text-text sm:text-[60px] sm:leading-[1.03]" style={{ animationDelay: "0.15s" }}>
            Buy a car, without the <span className="lp-grad">guesswork.</span>
          </h1>
          <div className="lp-rise mt-7 flex flex-wrap items-center gap-x-8 gap-y-4" style={{ animationDelay: "0.28s" }}>
            <Link
              href={primaryHref}
              className="sheen group inline-flex items-center gap-3.5 rounded-full bg-accent py-1.5 pl-6 pr-1.5 text-[15px] font-extrabold text-on-accent transition hover:bg-accent-hover"
            >
              {primaryLabel}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-on-accent text-[16px] text-accent transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <span className="flex items-center gap-2 text-[13px] font-medium text-muted">
              <span className="h-[7px] w-[7px] rounded-full bg-accent" style={{ animation: "pulseDot 1.4s ease-in-out infinite" }} />
              {auctions} auctions live in Japan right now
            </span>
          </div>
        </div>

        {/* scroll cue */}
        <div className="lp-cue absolute bottom-5 left-1/2 -translate-x-1/2" style={{ opacity: heroFade.toFixed(3) }} aria-hidden>
          <span className="lp-cue-mouse" />
        </div>
      </section>

      {/* ---- marquee (dual direction, faded edges) ---- */}
      <div className="border-y border-border py-3">
        <div className="lp-mask overflow-hidden">
          <div className="lp-marquee inline-flex whitespace-nowrap">
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <span key={i} className="inline-flex items-center gap-2.5 px-7 text-[14px] font-semibold text-dim">
                {m} <span className="text-border">·</span>
              </span>
            ))}
          </div>
        </div>
        <div className="lp-mask mt-1 overflow-hidden">
          <div className="lp-marquee lp-marquee-rev inline-flex whitespace-nowrap">
            {[...MARQUEE].reverse().concat([...MARQUEE].reverse()).map((m, i) => (
              <span key={i} className="inline-flex items-center gap-2.5 px-7 text-[14px] font-semibold text-dim/70">
                {m} <span className="text-border">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ---- stats strip (count-up) ---- */}
      <section ref={statsRef} className="mx-auto w-full max-w-[1180px] px-6 pt-16 sm:px-10">
        <div className="grid grid-cols-2 gap-4 rounded-[22px] border border-border bg-card p-6 sm:grid-cols-4 sm:p-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-[30px] font-extrabold tabular-nums text-accent sm:text-[38px]">
                {comma(Math.round(s.target * statP))}
                {s.suffix}
              </p>
              <p className="mt-1 text-[12.5px] font-semibold uppercase tracking-[0.04em] text-dim">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- pillars ---- */}
      <section id="pillars" className="mx-auto w-full max-w-[1180px] px-6 py-14 sm:py-24 sm:px-10">
        <p className="mb-4 inline-flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-accent">
          <span className="bg-accent" style={{ width: 18, height: 2 }} /> Four pillars
        </p>
        <h2 className="mb-12 max-w-[600px] text-[26px] font-extrabold tracking-[-0.02em] text-text sm:text-[38px]">
          One workflow, four ways to buy.
        </h2>
        <div className="grid gap-4.5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { n: "01", title: "Brand New Cars", blurb: "Dealer inventory and warranty terms, one catalog.", core: false },
            { n: "02", title: "Used Car P2P", blurb: "Verified ownership, direct offers, no middlemen.", core: false },
            { n: "03", title: "Reconditioned Import", blurb: "Licensed agents, live Japanese auctions, real-time cost.", core: true },
            { n: "04", title: "Modification Studio", blurb: "BRTA-legal parts, filtered to fit your car.", core: false },
          ].map((p) => (
            <Link
              key={p.n}
              href={loggedIn ? "/" : "/login"}
              className={`lp-zoom group relative overflow-hidden rounded-[20px] border p-7 ${
                p.core ? "border-accent bg-accent-tint" : "border-border bg-card"
              }`}
            >
              {p.core && (
                <span className="absolute right-4 top-4 rounded-md bg-accent px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.04em] text-on-accent">Core</span>
              )}
              <p className={`mb-4 text-[13px] font-bold ${p.core ? "text-accent" : "text-dim"}`}>{p.n}</p>
              <h3 className="mb-2.5 text-[19px] font-bold text-text">{p.title}</h3>
              <p className={`text-[14px] leading-[1.6] ${p.core ? "text-accent" : "text-muted"}`}>{p.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ---- live cost demo ---- */}
      <section className="mx-auto w-full max-w-[1180px] px-6 pb-14 sm:pb-24 sm:px-10">
        <div className="lp-pulse relative grid items-center gap-8 overflow-hidden rounded-[26px] border border-border bg-card p-6 sm:gap-10 sm:p-12 lg:grid-cols-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={`lp-bubble lp-bubble-${i}`} aria-hidden />
          ))}
          <div>
            <p className="mb-4 inline-flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-accent">
              <span className="bg-accent" style={{ width: 18, height: 2 }} /> Live, not static
            </p>
            <h2 className="mb-4 text-[30px] font-extrabold tracking-[-0.01em] text-text">Cost updates as the auction moves.</h2>
            <p className="max-w-[440px] text-[15px] leading-[1.7] text-muted">
              Duty, shipping, and agent fees recalculate with every bid — so the number you see is the
              number you pay. This is the exact formula the bidding screen runs.
            </p>
          </div>

          <div className="lp-border relative rounded-[18px] border border-border bg-bg p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[13px] text-muted">Toyota Harrier Hybrid · 2019</span>
              <span className="flex items-center gap-1.5 rounded-full bg-accent-tint px-2.5 py-1 text-[11px] font-bold text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" style={{ animation: "pulseDot 1.4s ease-in-out infinite" }} />
                LIVE
              </span>
            </div>
            <DemoRow label="Current bid" value={jpy(bidJpy)} flash={flash} />
            <DemoRow label="Exchange rate" value={`1 JPY ≈ ${rate.toFixed(4)} BDT`} />
            <DemoRow label="NBR import duty (30%)" value={bdt(duty)} />
            <DemoRow label="Shipping" value={bdt(shipping)} />
            <DemoRow label="Agent fee (3%)" value={bdt(agentFee)} />
            <DemoRow label="Port handling" value={bdt(port)} />
            <div className="flex items-center justify-between pt-3.5 text-[18px]">
              <span className="font-extrabold text-text">Total landed cost</span>
              <span
                className="font-extrabold tabular-nums text-accent"
                style={{ transform: flash ? "scale(1.07)" : "scale(1)", transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1)", transformOrigin: "right center" }}
              >
                {bdt(total)}
              </span>
            </div>
            <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-track">
              <div className="lp-bar h-full rounded-full bg-accent transition-[width] duration-[1200ms] ease-out" style={{ width: `${barPct}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* ---- how it works ---- */}
      <section id="how" className="mx-auto w-full max-w-[1180px] px-6 pb-14 sm:pb-24 sm:px-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-accent">
              <span className="bg-accent" style={{ width: 18, height: 2 }} /> How it works
            </p>
            <h2 className="mb-7 text-[26px] font-extrabold leading-[1.15] tracking-[-0.02em] text-text sm:text-[38px]">
              Four steps, start to delivery.
            </h2>
            <Link
              href={primaryHref}
              className="sheen group inline-flex items-center gap-3.5 rounded-full border border-border bg-card py-1.5 pl-6 pr-1.5 text-[14px] font-bold text-text transition hover:border-accent"
            >
              {primaryLabel}
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[14px] text-on-accent transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
          <div className="grid gap-3.5">
            {STEPS.map((s) => (
              <div key={s.n} className="lp-zoom flex gap-4 rounded-2xl border border-border bg-card p-5.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-tint text-[15px] font-extrabold text-accent">{s.n}</span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-dim">Step {s.n}</p>
                  <p className="text-[17px] font-bold text-text">{s.title}</p>
                  <p className="mt-0.5 text-[14px] leading-[1.5] text-muted">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- trust / testimonials ---- */}
      <section id="trust" className="mx-auto w-full max-w-[1180px] px-6 pb-14 sm:pb-24 sm:px-10">
        <p className="mb-4 inline-flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-accent">
          <span className="bg-accent" style={{ width: 18, height: 2 }} /> Why AutoBD
        </p>
        <h2 className="mb-10 max-w-[600px] text-[26px] font-extrabold tracking-[-0.02em] text-text sm:text-[38px]">
          Trusted by buyers across Bangladesh.
        </h2>
        <div className="mb-4.5 grid gap-4.5 md:grid-cols-2">
          <Feature title="Container Pooling" body="Shared shipping with nearby buyers cuts cost up to 30%." />
          <Feature title="BRTA Paper Value Tracker" body="See remaining import-eligible registration life upfront." />
        </div>
        <div className="grid gap-4.5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="lp-zoom rounded-2xl border border-border bg-card p-6">
              <p className="mb-4 text-[14.5px] leading-[1.6] text-muted">&ldquo;{t.quote}&rdquo;</p>
              <div className="mb-2 bg-border" style={{ width: 18, height: 2 }} />
              <p className="text-[13px] font-bold text-accent">{t.name}</p>
              <p className="text-[12px] text-dim">{t.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- final CTA (expanding rings + bubbles) ---- */}
      <section className="mx-auto w-full max-w-[1180px] px-6 pb-14 sm:pb-24 sm:px-10">
        <div className="lp-pulse relative overflow-hidden rounded-[28px] border border-border bg-card p-7 text-center sm:p-16">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`lp-bubble lp-bubble-${i}`} aria-hidden />
          ))}
          <h2 className="mb-3.5 text-[26px] font-extrabold tracking-[-0.02em] text-text sm:text-[40px]">Ready to find your car?</h2>
          <p className="mb-8 text-[16px] text-muted">
            {loggedIn ? "Jump back into your dashboard." : "Log in or create a free account to get started."}
          </p>
          <div className="relative inline-block">
            <span className="lp-ring" aria-hidden />
            <span className="lp-ring lp-ring-2" aria-hidden />
            <Link
              href={primaryHref}
              className="sheen group relative inline-flex items-center gap-3.5 rounded-full bg-accent py-1.5 pl-7 pr-1.5 text-[15px] font-extrabold text-on-accent transition hover:bg-accent-hover"
            >
              {loggedIn ? "Open the app" : "Log in to get started"}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-on-accent text-[16px] text-accent transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ---- gallery ---- */}
      <section id="gallery" className="mx-auto w-full max-w-[1180px] px-6 pb-14 sm:pb-24 sm:px-10">
        <p className="mb-4 inline-flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-accent">
          <span className="bg-accent" style={{ width: 18, height: 2 }} /> Gallery
        </p>
        <h2 className="mb-9 max-w-[600px] text-[26px] font-extrabold tracking-[-0.02em] text-text sm:text-[38px]">
          The kind of cars you&apos;ll find here.
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:grid-rows-2 sm:[grid-auto-rows:220px]">
          {GALLERY.map((g) => (
            <div
              key={g.src}
              className={`lp-tile group relative overflow-hidden rounded-[20px] border border-border ${
                g.big ? "col-span-2 sm:col-span-1 sm:row-span-2" : ""
              }`}
              style={{ height: g.big ? undefined : 220 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.src} alt={g.label} loading="lazy" className="lp-tile-img h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg,transparent 40%,rgba(0,0,0,0.65) 100%)" }} />
              <p className="lp-tile-cap absolute bottom-4 left-4 text-[14px] font-bold text-white drop-shadow">{g.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- footer ---- */}
      <footer className="border-t border-border px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4">
          <span className="text-[16px] font-extrabold text-text">Auto<span className="text-accent">BD</span></span>
          <span className="text-[13px] text-dim">© 2026 AutoBD · Dhaka, Bangladesh</span>
          <Link href={primaryHref} className="text-[13px] font-bold text-accent hover:underline">
            {loggedIn ? "Enter app →" : "Log in →"}
          </Link>
        </div>
      </footer>
    </div>
  );
}

function DemoRow({ label, value, flash }: { label: string; value: string; flash?: boolean }) {
  return (
    <div
      className="flex items-center justify-between rounded-lg border-b border-track px-1.5 py-2.5 text-sm transition-colors duration-500"
      style={{ background: flash ? "var(--accent-tint)" : "transparent" }}
    >
      <span className="text-muted">{label}</span>
      <span className="font-bold tabular-nums text-text">{value}</span>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="lp-zoom rounded-2xl border border-border bg-card p-7">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-tint">
          <span className="h-2 w-2 rounded-full bg-accent" style={{ animation: "lpDotBreathe 2s ease-in-out infinite" }} />
        </span>
        <p className="text-[14px] font-bold uppercase tracking-[0.04em] text-accent">{title}</p>
      </div>
      <p className="text-[15px] leading-[1.6] text-muted">{body}</p>
    </div>
  );
}

const LANDING_CSS = `
  @keyframes lpMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  @keyframes lpMarqueeRev { from { transform: translateX(-50%); } to { transform: translateX(0); } }
  @keyframes lpDotBreathe { 0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(var(--accent-rgb),0.5); } 50% { transform: scale(1.15); box-shadow: 0 0 0 6px rgba(var(--accent-rgb),0); } }
  @keyframes lpBlobA { 0%,100% { border-radius:42% 58% 65% 35%/45% 40% 60% 55%; transform:translate(0,0) scale(1);} 33% { border-radius:60% 40% 35% 65%/55% 65% 35% 45%; transform:translate(20px,-30px) scale(1.06);} 66% { border-radius:35% 65% 55% 45%/40% 50% 50% 60%; transform:translate(-15px,15px) scale(0.97);} }
  @keyframes lpBlobB { 0%,100% { border-radius:55% 45% 40% 60%/50% 55% 45% 50%; transform:translate(0,0) scale(1);} 50% { border-radius:38% 62% 60% 40%/60% 40% 60% 40%; transform:translate(-25px,20px) scale(1.08);} }
  @keyframes lpBubble { 0% { transform:translateY(0) scale(0.6); opacity:0;} 12% { opacity:0.5;} 85% { opacity:0.2;} 100% { transform:translateY(-170px) scale(1.3); opacity:0;} }
  @keyframes lpRing { 0% { transform:scale(0.85); opacity:0.7;} 100% { transform:scale(1.6); opacity:0;} }
  @keyframes lpPulse { 0%,100% { transform:scale(1);} 50% { transform:scale(1.012);} }
  @keyframes lpBorder { 0% { background-position:0% 50%;} 100% { background-position:200% 50%;} }
  @keyframes lpRise { from { opacity:0; transform:translateY(26px); } to { opacity:1; transform:translateY(0); } }
  @keyframes lpShimmer { to { background-position:200% 0; } }
  @keyframes lpCue { 0% { transform:translateY(0); opacity:0.9; } 70% { transform:translateY(9px); opacity:0.2; } 100% { transform:translateY(0); opacity:0.9; } }

  .lp-rise { animation: lpRise 0.8s cubic-bezier(0.16,1,0.3,1) both; }

  .lp-grad {
    background: linear-gradient(90deg, var(--accent), var(--accent-hover), var(--accent));
    background-size: 220% 100%;
    -webkit-background-clip: text; background-clip: text; color: transparent;
    animation: lpShimmer 3.5s linear infinite;
  }

  .lp-hero-imgwrap { position:absolute; inset:-40px; will-change:transform; transition:transform 0.05s linear; }
  .lp-hero-img { position:absolute; inset:0; background-size:cover; background-position:center 55%; transition:opacity 0.5s ease; }
  .lp-hero-light { background-image:url('/landing/hero-car-light.jpg'); opacity:1; }
  .lp-hero-dark { background-image:url('/landing/hero-car.png'); opacity:0; }
  :root[data-theme="dark"] .lp-hero-light { opacity:0; }
  :root[data-theme="dark"] .lp-hero-dark { opacity:1; }
  .lp-hero-overlay { position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0) 28%, var(--bg) 100%); }
  .lp-hero-overlay-side { position:absolute; inset:0; background:linear-gradient(90deg, var(--bg) 0%, transparent 46%); opacity:0.55; }

  .lp-cue-mouse { display:block; width:22px; height:34px; border-radius:12px; border:2px solid var(--accent); position:relative; opacity:0.7; }
  .lp-cue-mouse::after { content:''; position:absolute; left:50%; top:6px; width:3px; height:7px; border-radius:2px; background:var(--accent); transform:translateX(-50%); animation:lpCue 1.6s ease-in-out infinite; }

  .lp-mask { -webkit-mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent); mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent); }
  .lp-marquee { animation: lpMarquee 30s linear infinite; }
  .lp-marquee-rev { animation: lpMarqueeRev 34s linear infinite; }
  .lp-mask:hover .lp-marquee { animation-play-state: paused; }

  .lp-blob { position:absolute; pointer-events:none; z-index:0; filter:blur(22px); }
  .lp-blob-a { top:620px; right:-120px; width:520px; height:520px; background:radial-gradient(circle,rgba(var(--accent-rgb),0.14),transparent 68%); animation:lpBlobA 14s ease-in-out infinite; }
  .lp-blob-b { top:1700px; left:-160px; width:460px; height:460px; background:radial-gradient(circle,rgba(var(--accent-rgb),0.10),transparent 70%); animation:lpBlobB 18s ease-in-out infinite; }

  .lp-zoom { transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease, border-color 0.4s ease; }
  .lp-zoom:hover { transform: translateY(-8px) scale(1.02); border-color: rgba(var(--accent-rgb),0.4); box-shadow: var(--shadow-lg); }

  .lp-pulse { animation: lpPulse 7s ease-in-out infinite; }

  .lp-border::before { content:''; position:absolute; inset:-1px; border-radius:19px; padding:1px; background:linear-gradient(90deg, rgba(var(--accent-rgb),0.6), rgba(var(--accent-rgb),0), rgba(var(--accent-rgb),0.6)); background-size:200% 100%; animation:lpBorder 3.5s linear infinite; -webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none; }
  .lp-bar { position:relative; }
  .lp-bar::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); background-size:60% 100%; animation:lpBorder 2s linear infinite; }

  .lp-bubble { position:absolute; bottom:6%; border-radius:50%; pointer-events:none; background:radial-gradient(circle at 35% 30%, rgba(var(--accent-rgb),0.5), rgba(var(--accent-rgb),0.05)); animation:lpBubble linear infinite; }
  .lp-bubble-0 { width:20px; height:20px; left:9%; animation-duration:7s; animation-delay:0.2s; }
  .lp-bubble-1 { width:13px; height:13px; left:18%; animation-duration:5.5s; animation-delay:1.6s; }
  .lp-bubble-2 { width:10px; height:10px; left:27%; animation-duration:6.2s; animation-delay:3s; }
  .lp-bubble-3 { width:17px; height:17px; right:12%; animation-duration:6.8s; animation-delay:0.8s; }
  .lp-bubble-4 { width:12px; height:12px; right:22%; animation-duration:5s; animation-delay:2.4s; }

  .lp-ring { position:absolute; inset:-6px; border-radius:999px; border:1.5px solid rgba(var(--accent-rgb),0.5); animation:lpRing 2.4s ease-out infinite; pointer-events:none; }
  .lp-ring-2 { animation-delay:1.2s; }

  .lp-tile-img { transition: transform 0.6s cubic-bezier(0.16,1,0.3,1); }
  .lp-tile:hover .lp-tile-img { transform: scale(1.09); }
  .lp-tile { transition: box-shadow 0.4s ease, transform 0.4s ease; }
  .lp-tile:hover { box-shadow: 0 18px 40px -18px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(var(--accent-rgb),0.6); }
  .lp-tile-cap { transition: transform 0.4s cubic-bezier(0.16,1,0.3,1); }
  .lp-tile:hover .lp-tile-cap { transform: translateY(-3px); }

  @media (prefers-reduced-motion: reduce) {
    .lp-marquee, .lp-marquee-rev, .lp-blob, .lp-pulse, .lp-bubble, .lp-ring, .lp-border::before, .lp-bar::after, .lp-hero-imgwrap, .lp-grad, .lp-rise, .lp-cue-mouse::after { animation: none !important; transition: none !important; }
    .lp-grad { color: var(--accent); }
  }
`;
