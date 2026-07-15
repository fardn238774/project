import { prisma } from "@/lib/prisma";
import { num } from "@/lib/format";

export type FeedBid = { id: string; who: string; amountJpy: number; mine: boolean };

/**
 * Bidders are anonymised in the public feed, as at a real auction house — you
 * see that someone bid, not who. The label is derived from the bidder id so it
 * stays stable across polls, and the viewer sees their own bids as "You".
 */
function anonLabel(bidderId: string) {
  let hash = 0;
  for (let i = 0; i < bidderId.length; i++) {
    hash = (hash * 31 + bidderId.charCodeAt(i)) | 0;
  }
  return `Bidder #${String(Math.abs(hash) % 90 + 10)}`;
}

export async function readBidFeed(
  auctionCarId: string,
  viewerBuyerId: string | null,
  take = 8,
): Promise<FeedBid[]> {
  const bids = await prisma.bid.findMany({
    where: { auctionCarId },
    orderBy: { amountJpy: "desc" },
    take,
  });

  return bids.map((b) => ({
    id: b.id,
    who: b.bidderId === viewerBuyerId ? "You" : anonLabel(b.bidderId),
    amountJpy: num(b.amountJpy),
    mine: b.bidderId === viewerBuyerId,
  }));
}
