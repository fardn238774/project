import { ServiceFinder } from "./ServiceFinder";

export const metadata = { title: "Service Centers — AutoBD" };

export default function ServicesPage() {
  return (
    <main className="mx-auto w-full max-w-[1100px] px-5 sm:px-8 lg:px-10 pb-20 pt-6">
      <p className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.05em] text-accent">
        <span
          className="h-1.5 w-1.5 rounded-full bg-accent"
          style={{ animation: "pulseDot 1.4s ease-in-out infinite" }}
        />
        Service locator
      </p>
      <h1 className="mb-2 text-[32px] font-extrabold tracking-[-0.01em] text-text">
        Find a <span className="gradient-text">service center</span>
      </h1>
      <p className="mb-6 max-w-[660px] text-[15px] leading-[1.6] text-muted">
        Locate the closest car repair, tyre, parts and wash shops around you on a real map —
        distance-sorted, with one-tap directions. Live data from OpenStreetMap, no simulation.
      </p>

      <ServiceFinder />
    </main>
  );
}
