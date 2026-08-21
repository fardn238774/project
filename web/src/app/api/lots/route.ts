import { prisma } from "@/lib/prisma";
import { LotStatus } from "@/generated/prisma/enums";

/**
 * Assignment REST endpoint (Live Auction feature) — list auction lots (cars).
 * Public read, database-connected, returns JSON, so it is easy to test in
 * Postman with no login. Optional filter: ?status=LIVE|PENDING|SOLD|NO_SALE
 *
 *   GET /api/lots
 *   GET /api/lots?status=LIVE
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("status");
  const status =
    raw && (Object.values(LotStatus) as string[]).includes(raw)
      ? (raw as LotStatus)
      : undefined;

  const lots = await prisma.auctionCar.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      bids: { orderBy: { amountJpy: "desc" }, take: 1 },
      auction: { select: { house: true, location: true } },
    },
  });

  const data = lots.map((lot) => ({
    id: lot.id,
    lotNumber: lot.lotNumber,
    car: `${lot.manufactureYear} ${lot.make} ${lot.model}`,
    grade: lot.grade,
    status: lot.status,
    startingPriceJpy: Number(lot.startingPriceJpy.toString()),
    topBidJpy: lot.bids[0] ? Number(lot.bids[0].amountJpy.toString()) : null,
    auctionHouse: lot.auction.house,
    location: lot.auction.location,
  }));

  return Response.json({ count: data.length, lots: data });
}
