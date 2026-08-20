"use client";

import { useState } from "react";
import Link from "next/link";
import { bdt, bdtPerYear } from "@/lib/format";

/** Prototype default. */
const DEFAULT_MONTHLY_KM = 1200;

export function TcoCalculator({
  regTaxBdt,
  tokenTaxBdt,
  insuranceBdt,
  fuelPricePerL,
  kmPerL,
}: {
  regTaxBdt: number;
  tokenTaxBdt: number;
  insuranceBdt: number;
  fuelPricePerL: number;
  kmPerL: number;
}) {
  const [monthlyKm, setMonthlyKm] = useState(DEFAULT_MONTHLY_KM);

  const fuelCostMonthly = (monthlyKm / kmPerL) * fuelPricePerL;
  // Not in the prototype, but the FR asks for "total cost of ownership" — the
  // per-line figures alone never add up to one.
  const firstYearTotal = regTaxBdt + tokenTaxBdt + insuranceBdt + fuelCostMonthly * 12;

  return (
    <section className="rounded-2xl border border-border bg-card p-[22px]">
      <h2 className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
        Total cost of ownership — Bangladesh
      </h2>

      <div className="mb-4.5 flex items-center gap-3.5">
        <label
          htmlFor="monthlyKm"
          className="whitespace-nowrap text-[13px] text-muted"
        >
          Monthly driving: {monthlyKm.toLocaleString("en-US")} km
        </label>
        <input
          id="monthlyKm"
          type="range"
          min={300}
          max={3000}
          step={100}
          value={monthlyKm}
          onChange={(e) => setMonthlyKm(Number(e.target.value))}
          className="flex-1 accent-[var(--accent)]"
        />
      </div>

      <div className="grid gap-3 text-sm md:grid-cols-2">
        <Row label="Registration tax" value={bdt(regTaxBdt)} />
        <Row label="Annual BRTA token tax" value={bdtPerYear(tokenTaxBdt)} />
        <Row label="Est. monthly fuel cost" value={bdt(fuelCostMonthly)} />
        <Row label="Insurance estimate" value={bdtPerYear(insuranceBdt)} />
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t border-border pt-3.5">
        <span className="text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          First-year total
        </span>
        <span className="text-[17px] font-extrabold text-accent">{bdt(firstYearTotal)}</span>
      </div>
      <p className="mt-1.5 text-xs text-dim">
        Registration tax once, plus token tax, insurance and {monthlyKm.toLocaleString("en-US")}{" "}
        km/month of fuel at {bdt(fuelPricePerL)}/L over {kmPerL} km/l.
      </p>

      <div className="mt-4.5 flex gap-2.5">
        <Link
          href="/auctions"
          className="flex-1 rounded-[9px] bg-ink py-2.75 text-center text-[13px] font-semibold text-white"
        >
          See auction listings
        </Link>
        <Link
          href="/used-cars"
          className="flex-1 rounded-[9px] bg-chip py-2.75 text-center text-[13px] font-semibold text-text"
        >
          See used listings
        </Link>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-track py-2">
      <span className="text-muted">{label}</span>
      <span className="font-bold text-text">{value}</span>
    </div>
  );
}
