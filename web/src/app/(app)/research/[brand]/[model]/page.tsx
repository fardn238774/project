import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { bdt, bdtLakh, num } from "@/lib/format";
import { brandOf } from "@/lib/research";
import { TcoCalculator } from "./TcoCalculator";
import { YearPriceSelector } from "./YearPriceSelector";

const ANNUAL_KM = 15000;
const CATEGORIES = ["Routine service", "Wear & tear", "Major job"] as const;

export default async function ResearchDetailPage({
  params,
}: {
  params: Promise<{ brand: string; model: string }>;
}) {
  const { brand, model: modelSlug } = await params;

  const model = await prisma.researchModel.findUnique({
    where: { slug: modelSlug },
    include: { issues: true, marketPrice: true, maintenance: true },
  });
  if (!model) notFound();

  const b = brandOf(model.name);
  // Keep the URL honest: /research/toyota/harrier must actually be a Toyota.
  if (b.slug !== brand) notFound();

  const mp = model.marketPrice;
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 16 }, (_, i) => thisYear - 1 - i);

  // Annualise every item that has a service interval (routine + wear) at a
  // typical 15,000 km/year. One-off "major" jobs have no interval and show as
  // reference prices only.
  const annualEstimate = Math.round(
    model.maintenance
      .filter((m) => m.intervalKm)
      .reduce((sum, m) => sum + m.priceBdt * (ANNUAL_KM / m.intervalKm!), 0),
  );

  return (
    <main className="mx-auto w-full max-w-[900px] px-10 pb-20 pt-6">
      <Link
        href={`/research/${brand}`}
        className="mb-4.5 block text-[13px] text-muted hover:text-text"
      >
        &larr; Back to {b.name}
      </Link>
      <h1 className="mb-5 text-[30px] font-extrabold text-text">{model.name}</h1>

      {/* Live used-car market price — scraped from Bikroy, cached in MarketPrice. */}
      <section className="mb-4 rounded-2xl border border-border bg-card p-[22px]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
            Used market price
          </h2>
          {mp && (
            <span className="rounded-md bg-chip px-2 py-1 text-[11px] font-bold text-dim">
              Bikroy · {mp.sampleCount} listings
            </span>
          )}
        </div>
        {mp ? (
          <>
            <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.03em] text-dim">Average asking</p>
                <p className="text-[26px] font-extrabold text-accent">{bdtLakh(mp.avgPriceBdt)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.03em] text-dim">Range</p>
                <p className="text-[15px] font-bold text-text">
                  {bdtLakh(mp.minPriceBdt)} – {bdtLakh(mp.maxPriceBdt)}
                </p>
              </div>
            </div>
            {mp.samples.length > 0 && (
              <p className="mt-3 text-[12.5px] text-muted">
                Recent asking prices: {mp.samples.map((s) => bdtLakh(s)).join(" · ")}
              </p>
            )}
            <p className="mt-2 text-[11px] text-dim">
              Scraped from Bikroy.com · updated{" "}
              {new Date(mp.scrapedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              . Live classifieds data — figures move with the market.
            </p>
          </>
        ) : (
          <p className="text-[13px] text-muted">
            No recent matching listings found on Bikroy for this model. Live prices refresh
            when the scraper runs.
          </p>
        )}

        <YearPriceSelector modelName={model.name} years={years} />
      </section>

      <section className="mb-4 rounded-2xl border border-border bg-card p-[22px]">
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          Generations &amp; specs
        </h2>
        <p className="text-sm leading-[1.7] text-text">{model.specs}</p>
      </section>

      <section className="mb-4 rounded-2xl border border-border bg-card p-[22px]">
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          Common reliability issues
        </h2>
        <div className="grid gap-2">
          {model.issues.map((issue) => (
            <p
              key={issue.id}
              className="rounded-[9px] bg-chip px-3 py-2.25 text-[13.5px] text-text"
            >
              {issue.text}
            </p>
          ))}
        </div>
      </section>

      {/* Parts & maintenance cost — curated BD workshop prices. */}
      {model.maintenance.length > 0 && (
        <section className="mb-4 rounded-2xl border border-border bg-card p-[22px]">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
              Parts &amp; maintenance cost
            </h2>
            <span className="rounded-lg bg-[#eef6f1] px-3 py-1.5 text-[12.5px] font-bold text-[#1e6b42]">
              ≈ {bdt(annualEstimate)}/yr running upkeep
            </span>
          </div>
          {CATEGORIES.map((cat) => {
            const items = model.maintenance.filter((m) => m.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="mb-3.5 last:mb-0">
                <p className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.03em] text-muted">
                  {cat}
                </p>
                <div className="overflow-hidden rounded-xl border border-track">
                  {items.map((m, i) => (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13.5px] ${
                        i > 0 ? "border-t border-track" : ""
                      }`}
                    >
                      <span className="min-w-0 text-text">
                        {m.name}
                        {m.intervalKm ? (
                          <span className="text-dim">
                            {" "}
                            · every {m.intervalKm.toLocaleString("en-US")} km
                          </span>
                        ) : null}
                        {m.note ? <span className="text-dim"> · {m.note}</span> : null}
                      </span>
                      <span className="shrink-0 font-bold text-text">{bdt(m.priceBdt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <p className="mt-2 text-[11px] text-dim">
            Indicative Bangladesh workshop prices (parts + labour). The yearly figure amortises
            routine &amp; wear items at 15,000 km/year; major jobs are one-off reference costs.
          </p>
        </section>
      )}

      <TcoCalculator
        regTaxBdt={num(model.regTaxBdt)}
        tokenTaxBdt={num(model.tokenTaxBdt)}
        insuranceBdt={num(model.insuranceBdt)}
        fuelPricePerL={num(model.fuelPricePerL)}
        kmPerL={num(model.kmPerL)}
      />
    </main>
  );
}
