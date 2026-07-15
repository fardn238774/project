"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentBuyer } from "@/lib/session";
import { ListingStatus, OfferStatus } from "@/generated/prisma/client";
import { bdt } from "@/lib/format";

export type OfferResult = { error?: string; sentAmount?: string };

/** Accepts "৳20,50,000", "2050000", "20,50,000" — all the same offer. */
function parseBdt(raw: string): number {
  const digits = raw.replace(/[^\d.]/g, "");
  const n = Number(digits);
  return Number.isFinite(n) ? n : NaN;
}

export async function submitOffer(
  _prev: OfferResult,
  formData: FormData,
): Promise<OfferResult> {
  const buyer = await currentBuyer();
  if (!buyer) return { error: "Only buyer accounts can make offers." };

  const listingId = String(formData.get("listingId") ?? "");
  const amount = parseBdt(String(formData.get("amount") ?? ""));

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter an offer amount, e.g. ৳20,50,000." };
  }

  const listing = await prisma.usedCarListing.findUnique({ where: { id: listingId } });
  if (!listing) return { error: "That listing is no longer available." };
  if (listing.sellerId === buyer.id) return { error: "You can't make an offer on your own listing." };
  if (listing.status === ListingStatus.SOLD) return { error: "That car has already sold." };

  const duplicate = await prisma.offer.findFirst({
    where: { listingId, buyerId: buyer.id, status: OfferStatus.PENDING },
  });
  if (duplicate) return { error: "You already have a pending offer on this listing." };

  // The seller's dashboard reads status, so flag the listing as having offers.
  await prisma.$transaction([
    prisma.offer.create({ data: { listingId, buyerId: buyer.id, amountBdt: amount } }),
    prisma.usedCarListing.update({
      where: { id: listingId },
      data: { status: ListingStatus.OFFER_RECEIVED },
    }),
  ]);

  revalidatePath(`/used-cars/${listingId}`);
  revalidatePath("/used-cars/seller");
  return { sentAmount: bdt(amount) };
}
