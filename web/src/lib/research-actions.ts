"use server";

import { requireUser } from "@/lib/session";
import { fetchModelPrices, aggregate } from "@/lib/research";

export type YearPrice = {
  year: number;
  count: number;
  avgBdt?: number;
  minBdt?: number;
  maxBdt?: number;
  error?: string;
};

/**
 * Live market price for a specific model + year, so the Research Hub can show
 * that a 2016 Axio and a 2020 Axio are not worth the same. Searches Bikroy for
 * "<model name> <year>" and aggregates the asking prices.
 */
export async function priceForYear(modelName: string, year: number): Promise<YearPrice> {
  await requireUser();

  const thisYear = new Date().getFullYear();
  if (!Number.isInteger(year) || year < 1980 || year > thisYear) {
    return { year, count: 0, error: "Pick a valid year." };
  }

  let prices: number[] = [];
  try {
    prices = await fetchModelPrices(`${modelName} ${year}`);
  } catch {
    return { year, count: 0, error: "Couldn't reach the market source. Try again." };
  }

  const agg = aggregate(prices);
  if (!agg) return { year, count: 0 };

  return {
    year,
    count: agg.sampleCount,
    avgBdt: agg.avgPriceBdt,
    minBdt: agg.minPriceBdt,
    maxBdt: agg.maxPriceBdt,
  };
}
