"use client";

import { useState, useTransition } from "react";
import { priceForYear, type YearPrice } from "@/lib/research-actions";
import { bdtLakh } from "@/lib/format";

export function YearPriceSelector({
  modelName,
  years,
}: {
  modelName: string;
  years: number[];
}) {
  const [year, setYear] = useState<string>("");
  const [result, setResult] = useState<YearPrice | null>(null);
  const [pending, start] = useTransition();

  const onPick = (value: string) => {
    setYear(value);
    setResult(null);
    if (!value) return;
    const y = Number(value);
    start(async () => setResult(await priceForYear(modelName, y)));
  };

  return (
    <div className="mt-4 rounded-xl border border-border bg-bg p-4">
      <label htmlFor="yearPick" className="mb-2 block text-[12.5px] font-semibold text-muted">
        Exact price by year — a {years[0]} and a {years[years.length - 1]} aren&apos;t worth the same
      </label>
      <select
        id="yearPick"
        value={year}
        onChange={(e) => onPick(e.target.value)}
        className="w-full rounded-[9px] border border-border bg-card px-3.5 py-2.5 text-sm text-text outline-none focus:border-accent sm:w-56"
      >
        <option value="">Select a year…</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      {pending && (
        <p className="mt-3 text-[13px] text-muted">Checking {year} listings on Bikroy…</p>
      )}

      {result && !pending && (
        <div className="mt-3">
          {result.error ? (
            <p className="text-[13px] text-[#c1442d]">{result.error}</p>
          ) : result.count > 0 ? (
            <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
              <div>
                <p className="text-[11px] uppercase tracking-[0.03em] text-dim">
                  {result.year} {modelName} · avg
                </p>
                <p className="text-[22px] font-extrabold text-accent">{bdtLakh(result.avgBdt!)}</p>
              </div>
              <p className="text-[13px] text-muted">
                range {bdtLakh(result.minBdt!)} – {bdtLakh(result.maxBdt!)} ·{" "}
                <span className="font-bold text-text">{result.count}</span> live listings
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-muted">
              No {result.year} {modelName} listings on the market right now — try a nearby year.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
