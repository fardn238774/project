"use server";

import { requireUser } from "@/lib/session";
import { fetchModelPrices, aggregate } from "@/lib/research";

export type ValueResult = {
  error?: string;
  ok?: boolean;
  estimateBdt?: number;
  lowBdt?: number;
  highBdt?: number;
  marketAvgBdt?: number;
  marketMinBdt?: number;
  marketMaxBdt?: number;
  marketCount?: number;
  make?: string;
  model?: string;
  breakdown?: { label: string; deltaPct: number }[];
};

// Percentage adjustments vs the market average for a car of this model.
const ACCIDENT: Record<string, number> = { none: 0, minor: -0.06, major: -0.15 };
const MAINTENANCE: Record<string, number> = { full: 0.05, partial: 0, none: -0.08 };
const REPAIRS: Record<string, number> = { none: 0, minor: -0.03, major: -0.1 };
const CONDITION: Record<string, number> = { excellent: 0.04, good: 0, fair: -0.06 };

/**
 * Estimate a car's resale value. The anchor is the LIVE market: we search Bikroy
 * for the same make+model and take the average asking price, then adjust for the
 * specific car's age, mileage, accident history, service records, past repairs,
 * condition and local demand. Every adjustment is returned in `breakdown`, so the
 * number is explainable — it's a market estimate, not a black box.
 */
export async function valueCar(_prev: ValueResult, fd: FormData): Promise<ValueResult> {
  await requireUser();

  const str = (k: string) => String(fd.get(k) ?? "").trim();
  const make = str("make");
  const model = str("model");
  const year = Number(str("year"));
  const mileage = Number(str("mileage"));
  const city = str("city");
  const accident = str("accident");
  const maintenance = str("maintenance");
  const repairs = str("repairs");
  const condition = str("condition");

  const thisYear = new Date().getFullYear();
  if (!make || !model) return { error: "Enter your car's make and model." };
  if (!Number.isInteger(year) || year < 1980 || year > thisYear)
    return { error: `Enter a valid manufacture year (1980–${thisYear}).` };
  if (!Number.isFinite(mileage) || mileage < 0 || mileage > 2_000_000)
    return { error: "Enter the mileage in kilometres." };

  // --- live market anchor ---
  let prices: number[] = [];
  try {
    prices = await fetchModelPrices(`${make} ${model}`);
  } catch {
    return { error: "Couldn't reach the market data source right now. Please try again." };
  }
  const agg = aggregate(prices);
  if (!agg) {
    return {
      error: `Couldn't find recent ${make} ${model} listings to anchor a price. Try a more common model name or check the spelling.`,
    };
  }

  const base = agg.avgPriceBdt;
  const age = Math.max(0, thisYear - year);
  const breakdown: { label: string; deltaPct: number }[] = [];
  const push = (label: string, deltaPct: number) => {
    if (deltaPct !== 0) breakdown.push({ label, deltaPct });
  };

  // Mileage vs an expected ~12,000 km/year.
  const expected = Math.max(1, age) * 12000;
  const ratio = mileage / expected;
  if (ratio < 0.75) push("Low mileage for its age", 0.05);
  else if (ratio > 1.4) push("Very high mileage for its age", -0.1);
  else if (ratio > 1.15) push("Above-average mileage", -0.05);

  // Age: the market average is a mix, so depreciate only beyond ~5 years.
  push(`${age} year${age === 1 ? "" : "s"} old`, Math.max(-0.2, -0.025 * Math.max(0, age - 5)));

  if (accident === "minor") push("Minor accident history", ACCIDENT.minor);
  else if (accident === "major") push("Major accident history", ACCIDENT.major);

  if (maintenance === "full") push("Full service records", MAINTENANCE.full);
  else if (maintenance === "none") push("No service records", MAINTENANCE.none);

  if (repairs === "minor") push("Minor past repairs", REPAIRS.minor);
  else if (repairs === "major") push("Major repairs / part replacements", REPAIRS.major);

  if (condition === "excellent") push("Excellent condition", CONDITION.excellent);
  else if (condition === "fair") push("Fair condition", CONDITION.fair);

  if (/dhaka/i.test(city)) push("Strong local demand (Dhaka)", 0.03);

  const total = breakdown.reduce((s, b) => s + b.deltaPct, 0);
  const clamped = Math.max(-0.4, Math.min(0.15, total));

  let estimate = Math.round(base * (1 + clamped));
  // Keep the estimate within a realistic band of what the market actually shows.
  estimate = Math.max(
    Math.round(agg.minPriceBdt * 0.85),
    Math.min(Math.round(agg.maxPriceBdt * 1.05), estimate),
  );

  return {
    ok: true,
    estimateBdt: estimate,
    lowBdt: Math.round(estimate * 0.94),
    highBdt: Math.round(estimate * 1.06),
    marketAvgBdt: base,
    marketMinBdt: agg.minPriceBdt,
    marketMaxBdt: agg.maxPriceBdt,
    marketCount: agg.sampleCount,
    make,
    model,
    breakdown,
  };
}
