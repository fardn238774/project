// Pure Research Hub helpers — no DB access, no `server-only` — so they can be
// imported from server components, the cron API route, AND the scraper CLI.

/** Derive the brand from a model name: "Toyota Harrier" -> { name:"Toyota", slug:"toyota" }. */
export function brandOf(name: string): { name: string; slug: string } {
  const brand = name.trim().split(/\s+/)[0] || name;
  return { name: brand, slug: brand.toLowerCase() };
}

// ------------------------------------------------- Bikroy price scraping

// Per-model search overrides, for when a model's full "Make Model" name matches
// poorly on Bikroy's strict (AND-based) search. Add entries here as needed.
const QUERY_OVERRIDE: Record<string, string> = {};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export function bikroyQuery(slug: string, name: string): string {
  return QUERY_OVERRIDE[slug] ?? name;
}

/** Extract the BDT asking prices from a Bikroy search-results page. */
export function extractPrices(html: string): number[] {
  const out: number[] = [];
  const re = /qa-advert-price">BDT\s+([\d,]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const n = Number(m[1].replace(/,/g, ""));
    // Sane used-car range in BDT (1 lakh … 10 crore) — drops stray/parts prices.
    if (Number.isFinite(n) && n >= 100000 && n <= 100000000) out.push(n);
  }
  return out;
}

/** Fetch a model's current asking prices from Bikroy. Throws on a network error. */
export async function fetchModelPrices(query: string): Promise<number[]> {
  const url = `https://bikroy.com/cars?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return extractPrices(await res.text());
}

export type PriceAgg = {
  minPriceBdt: number;
  avgPriceBdt: number;
  maxPriceBdt: number;
  sampleCount: number;
  samples: number[];
};

/** Reduce a list of prices to min/avg/max/count + a few samples. */
export function aggregate(prices: number[]): PriceAgg | null {
  if (prices.length === 0) return null;
  return {
    minPriceBdt: Math.min(...prices),
    maxPriceBdt: Math.max(...prices),
    avgPriceBdt: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    sampleCount: prices.length,
    samples: prices.slice(0, 6),
  };
}
