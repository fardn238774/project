import { prisma } from "@/lib/prisma";

/**
 * Assignment REST endpoint (Live Auction feature) — one auction lot's details
 * plus its current highest bids. Public read, database-connected.
 *
 *   GET /api/lots/<lotId>
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const lot = await prisma.auctionCar.findUnique({
    where: { id },
    include: {
      bids: { orderBy: { amountJpy: "desc" }, take: 3 },
      auction: { select: { house: true, location: true, startsAt: true } },
    },
  });

  if (!lot) return Response.json({ error: "Lot not found" }, { status: 404 });

  return Response.json({
    id: lot.id,
    lotNumber: lot.lotNumber,
    car: `${lot.manufactureYear} ${lot.make} ${lot.model}`,
    mileageKm: lot.mileageKm,
    engineCc: lot.engineCc,
    grade: lot.grade,
    chassisCode: lot.chassisCode,
    status: lot.status,
    startingPriceJpy: Number(lot.startingPriceJpy.toString()),
    topBidsJpy: lot.bids.map((b) => Number(b.amountJpy.toString())),
    auction: {
      house: lot.auction.house,
      location: lot.auction.location,
      startsAt: lot.auction.startsAt,
    },
  });
}
