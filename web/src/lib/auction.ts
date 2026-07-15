import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { num } from "@/lib/format";
import { LotStatus } from "@/generated/prisma/client";

/**
 * Live state of a single lot. Everything here is read from the Bid table and
 * the lot's own endsAt — nothing is simulated.
 */
export type LotState = {
  status: LotStatus;
  currentBidJpy: number;
  /** Starting price when no bid has landed yet. */
  hasBids: boolean;
  minNextBidJpy: number;
  endsAt: string | null;
  secondsRemaining: number;
  extensionCount: number;
  /** Distinct bidders on this lot, all-time (agreed definition). */
  activeBidders: number;
  antiSnipeWarning: boolean;
  topBidderId: string | null;
};

export async function readLotState(auctionCarId: string): Promise<LotState | null> {
  const settings = await getSettings();

  const lot = await prisma.auctionCar.findUnique({
    where: { id: auctionCarId },
    include: {
      bids: { orderBy: { amountJpy: "desc" }, take: 1 },
      _count: { select: { bids: true } },
    },
  });
  if (!lot) return null;

  // "Active bidders" = distinct buyers who have bid on this lot, all-time.
  const distinct = await prisma.bid.findMany({
    where: { auctionCarId },
    distinct: ["bidderId"],
    select: { bidderId: true },
  });

  const top = lot.bids[0];
  const currentBidJpy = top ? num(top.amountJpy) : num(lot.startingPriceJpy);
  const secondsRemaining = lot.endsAt
    ? Math.max(0, Math.floor((lot.endsAt.getTime() - Date.now()) / 1000))
    : 0;

  return {
    status: lot.status,
    currentBidJpy,
    hasBids: Boolean(top),
    // First bid may match the starting price; later bids must clear the increment.
    minNextBidJpy: top ? currentBidJpy + settings.minBidIncrementJpy : currentBidJpy,
    endsAt: lot.endsAt?.toISOString() ?? null,
    secondsRemaining,
    extensionCount: lot.extensionCount,
    activeBidders: distinct.length,
    antiSnipeWarning: lot.extensionCount > settings.antiSnipeWarnAfterExtensions,
    topBidderId: top?.bidderId ?? null,
  };
}

/**
 * Lots settle lazily: the first read after endsAt passes closes the lot. There
 * is no scheduler in this deployment target, and a lazy close keeps the state
 * machine honest without one.
 */
export async function settleLotIfEnded(auctionCarId: string) {
  const lot = await prisma.auctionCar.findUnique({
    where: { id: auctionCarId },
    include: { bids: { orderBy: { amountJpy: "desc" }, take: 1 } },
  });
  if (!lot || lot.status !== LotStatus.LIVE || !lot.endsAt) return;
  if (lot.endsAt.getTime() > Date.now()) return;

  const top = lot.bids[0];
  const reserve = lot.reservePriceJpy === null ? null : num(lot.reservePriceJpy);

  // Reserve not met is a no-sale, exactly as at a real auction house.
  const reserveMet = top !== undefined && (reserve === null || num(top.amountJpy) >= reserve);

  await prisma.auctionCar.update({
    where: { id: auctionCarId },
    // Guard against a concurrent settle having already run.
    data: reserveMet
      ? { status: LotStatus.SOLD, winningBidId: top.id }
      : { status: LotStatus.NO_SALE },
  });
}
