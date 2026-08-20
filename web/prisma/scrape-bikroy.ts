// Web scraper: real used-car market prices from Bikroy.com, cached into the
// MarketPrice table for the Research Hub. Also (re)loads the curated parts &
// servicing costs (MaintenanceItem) from prisma/maintenance.ts.
//
//   Run it any time to refresh:  npx tsx prisma/scrape-bikroy.ts
//
// The fetch/parse logic lives in src/lib/research.ts, shared with the scheduled
// cron route (src/app/api/cron/refresh-prices). The app NEVER scrapes on a page
// request — it only reads the cached table — so the Hub is fast and survives a
// scrape failure.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { MAINTENANCE } from "./maintenance";
import { bikroyQuery, fetchModelPrices, aggregate } from "../src/lib/research";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const taka = (n: number) => `৳${n.toLocaleString("en-IN")}`;

async function main() {
  const models = await prisma.researchModel.findMany({ orderBy: { name: "asc" } });

  for (const model of models) {
    // 1) Curated parts & servicing costs (refreshed from the shared source).
    const items = MAINTENANCE[model.slug] ?? [];
    if (items.length > 0) {
      await prisma.maintenanceItem.deleteMany({ where: { researchModelId: model.id } });
      await prisma.maintenanceItem.createMany({
        data: items.map((i) => ({ ...i, researchModelId: model.id })),
      });
      console.log(`[maintenance] ${model.name}: ${items.length} items`);
    }

    // 2) Live used-car market price from Bikroy.
    try {
      const prices = await fetchModelPrices(bikroyQuery(model.slug, model.name));
      const agg = aggregate(prices);
      if (!agg) {
        // Successful fetch, no matches → clear any stale cached figure.
        await prisma.marketPrice.deleteMany({ where: { researchModelId: model.id } });
        console.log(`[price] ${model.name}: no matching listings — cleared cached figure`);
      } else {
        const data = { source: "bikroy", ...agg, scrapedAt: new Date() };
        await prisma.marketPrice.upsert({
          where: { researchModelId: model.id },
          update: data,
          create: { researchModelId: model.id, ...data },
        });
        console.log(
          `[price] ${model.name}: ${agg.sampleCount} listings · avg ${taka(agg.avgPriceBdt)} (${taka(agg.minPriceBdt)}–${taka(agg.maxPriceBdt)})`,
        );
      }
    } catch (e) {
      console.log(`[price] ${model.name}: scrape failed (${(e as Error).message}) — keeping any cached figure`);
    }

    await sleep(1500); // polite pause between requests
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
