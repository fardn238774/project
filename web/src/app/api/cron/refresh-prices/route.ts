import { prisma } from "@/lib/prisma";
import { bikroyQuery, fetchModelPrices, aggregate } from "@/lib/research";

// Allow the whole scrape to run (a few sequential fetches). Honoured on Vercel
// plans that permit it; harmless elsewhere.
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Scheduled price refresh — pulls live used-car prices from Bikroy into the
 * MarketPrice cache. Triggered on a schedule (see web/vercel.json), never by a
 * page load.
 *
 * Secured with CRON_SECRET when it is set: Vercel Cron sends it as a Bearer
 * token. In local dev with no secret set it runs unauthenticated, so you can
 * trigger a refresh by simply opening the URL.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const models = await prisma.researchModel.findMany({ orderBy: { name: "asc" } });
  const results: { model: string; listings: number; avgBdt: number | null }[] = [];

  for (const model of models) {
    try {
      const prices = await fetchModelPrices(bikroyQuery(model.slug, model.name));
      const agg = aggregate(prices);
      if (!agg) {
        // Successful fetch, no matches → clear any stale cached figure.
        await prisma.marketPrice.deleteMany({ where: { researchModelId: model.id } });
        results.push({ model: model.name, listings: 0, avgBdt: null });
      } else {
        const data = { source: "bikroy", ...agg, scrapedAt: new Date() };
        await prisma.marketPrice.upsert({
          where: { researchModelId: model.id },
          update: data,
          create: { researchModelId: model.id, ...data },
        });
        results.push({ model: model.name, listings: agg.sampleCount, avgBdt: agg.avgPriceBdt });
      }
    } catch {
      // Network failure — keep whatever is cached. (-1 signals "fetch failed".)
      results.push({ model: model.name, listings: -1, avgBdt: null });
    }
    await sleep(800); // polite pause between requests
  }

  return Response.json(
    { ok: true, refreshedAt: new Date().toISOString(), results },
    { headers: { "Cache-Control": "no-store" } },
  );
}
