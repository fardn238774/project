"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentBuyer } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { num, jpy } from "@/lib/format";
import { LotStatus } from "@/generated/prisma/client";

export type BidResult = {
  error?: string;
  ok?: boolean;
  /** Set when the bid triggered an anti-snipe extension. */
  extendedBySeconds?: number;
};

/**
 * Places a real bid.
 *
 * Only a Buyer can reach this. There is deliberately no admin or organization
 * bid path anywhere in the codebase: price may only move through a real
 * buyer's bid, which makes shill bidding impossible by construction rather
 * than by policy.
 *
 * Anti-snipe (agreed rules): a bid landing inside antiSnipeWindowSeconds of
 * the close pushes endsAt out by antiSnipeExtendSeconds. There is no cap; past
 * antiSnipeWarnAfterExtensions we log, because that many extensions more
 * likely signals a bug than a real bidding war.
 */
export async function placeBid(auctionCarId: string, amountJpy: number): Promise<BidResult> {
  const buyer = await currentBuyer();
  if (!buyer) return { error: "Only buyer accounts can bid." };

  if (!Number.isFinite(amountJpy) || amountJpy <= 0) {
    return { error: "Enter a bid amount." };
  }

  const settings = await getSettings();

  try {
    // Serializable: two bids racing must not both pass the "beats the current
    // bid" check. Postgres aborts the loser, which surfaces below as a retry
    // prompt rather than a silently lost bid.
    const result = await prisma.$transaction(
      async (tx) => {
        const lot = await tx.auctionCar.findUnique({
          where: { id: auctionCarId },
          include: { bids: { orderBy: { amountJpy: "desc" }, take: 1 } },
        });
        if (!lot) return { error: "That lot no longer exists." };
        if (lot.status !== LotStatus.LIVE) return { error: "This lot is not open for bidding." };
        if (!lot.endsAt) return { error: "This lot has no close time yet." };

        const now = Date.now();
        const msRemaining = lot.endsAt.getTime() - now;
        if (msRemaining <= 0) return { error: "Bidding on this lot has closed." };

        const top = lot.bids[0];
        const currentJpy = top ? num(top.amountJpy) : num(lot.startingPriceJpy);
        const minNext = top ? currentJpy + settings.minBidIncrementJpy : currentJpy;

        if (amountJpy < minNext) {
          return { error: `Bid must be at least ${jpy(minNext)}.` };
        }

        // Anti-snipe: extend rather than let a late bid end the lot outright.
        const inWindow = msRemaining < settings.antiSnipeWindowSeconds * 1000;
        const extendedBySeconds = inWindow ? settings.antiSnipeExtendSeconds : 0;

        await tx.bid.create({
          data: { auctionCarId, bidderId: buyer.id, amountJpy },
        });

        if (inWindow) {
          const nextCount = lot.extensionCount + 1;
          await tx.auctionCar.update({
            where: { id: auctionCarId },
            data: {
              endsAt: new Date(lot.endsAt.getTime() + extendedBySeconds * 1000),
              extensionCount: nextCount,
            },
          });
          if (nextCount > settings.antiSnipeWarnAfterExtensions) {
            console.warn(
              `[anti-snipe] lot ${lot.lotNumber} (${auctionCarId}) has extended ${nextCount} times — above the configured warn threshold of ${settings.antiSnipeWarnAfterExtensions}.`,
            );
          }
        }

        return { ok: true, extendedBySeconds };
      },
      { isolationLevel: "Serializable" },
    );

    if (result.ok) revalidatePath("/auctions", "layout");
    return result;
  } catch {
    // Serialization failure = another bid landed first.
    return { error: "Another bid landed at the same moment — check the new price and retry." };
  }
}
