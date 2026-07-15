import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { num } from "@/lib/format";

/**
 * JPY -> BDT, fetched from a real exchange-rate API and cached in the
 * ExchangeRate table for exchangeRateTtlMinutes (agreed: 60).
 *
 * The prototype hardcoded 0.79. Nothing here is hardcoded except the
 * last-resort fallback below, which only applies when the API is unreachable
 * AND we have never cached a rate.
 */
const BASE = "JPY";
const QUOTE = "BDT";

// Free, keyless, no rate limit for this volume.
const ENDPOINT = "https://open.er-api.com/v6/latest/JPY";

/** Only used if the API is down and the cache is empty — see getJpyToBdt. */
const COLD_START_FALLBACK = 0.76;

export type Rate = {
  rate: number;
  fetchedAt: Date;
  /** True when the API failed and we served a cached/fallback value. */
  stale: boolean;
};

async function fetchLiveRate(): Promise<number | null> {
  try {
    const res = await fetch(ENDPOINT, {
      // We do our own DB-backed caching with an admin-editable TTL.
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data: unknown = await res.json();
    if (
      typeof data !== "object" ||
      data === null ||
      (data as { result?: string }).result !== "success"
    ) {
      return null;
    }
    const rate = (data as { rates?: Record<string, number> }).rates?.[QUOTE];
    return typeof rate === "number" && rate > 0 ? rate : null;
  } catch {
    // Network error / timeout / bad JSON — fall back to cache.
    return null;
  }
}

export async function getJpyToBdt(): Promise<Rate> {
  const [cached, ttlMinutes] = await Promise.all([
    prisma.exchangeRate.findUnique({ where: { base_quote: { base: BASE, quote: QUOTE } } }),
    getSetting("exchangeRateTtlMinutes"),
  ]);

  const ttlMs = ttlMinutes * 60 * 1000;
  const isFresh = cached && Date.now() - cached.fetchedAt.getTime() < ttlMs;
  if (cached && isFresh) {
    return { rate: num(cached.rate), fetchedAt: cached.fetchedAt, stale: false };
  }

  const live = await fetchLiveRate();
  if (live === null) {
    // Serving a known-old rate beats failing the whole screen, but say so.
    if (cached) {
      return { rate: num(cached.rate), fetchedAt: cached.fetchedAt, stale: true };
    }
    return { rate: COLD_START_FALLBACK, fetchedAt: new Date(0), stale: true };
  }

  const saved = await prisma.exchangeRate.upsert({
    where: { base_quote: { base: BASE, quote: QUOTE } },
    update: { rate: live, fetchedAt: new Date() },
    create: { base: BASE, quote: QUOTE, rate: live, fetchedAt: new Date() },
  });
  return { rate: num(saved.rate), fetchedAt: saved.fetchedAt, stale: false };
}
