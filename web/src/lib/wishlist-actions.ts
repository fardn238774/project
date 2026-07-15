"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentBuyer } from "@/lib/session";

export type WishlistResult = { error?: string; wishlisted?: boolean };

/** Real Wishlist row toggle. Buyers only — organizations don't wishlist. */
export async function toggleWishlist(auctionCarId: string): Promise<WishlistResult> {
  const buyer = await currentBuyer();
  if (!buyer) return { error: "Only buyer accounts can use the wishlist." };

  const lot = await prisma.auctionCar.findUnique({ where: { id: auctionCarId } });
  if (!lot) return { error: "That lot is no longer listed." };

  const existing = await prisma.wishlist.findUnique({
    where: { buyerId_auctionCarId: { buyerId: buyer.id, auctionCarId } },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
  } else {
    await prisma.wishlist.create({ data: { buyerId: buyer.id, auctionCarId } });
  }

  revalidatePath(`/auctions`, "layout");
  return { wishlisted: !existing };
}
