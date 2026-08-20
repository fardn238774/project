"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBuyer } from "@/lib/session";
import { CartItemKind, CartItemStatus, ListingStatus } from "@/generated/prisma/enums";
import { getJpyToBdt } from "@/lib/fx";
import { landedCostFor } from "@/lib/landed-cost-server";

export type CartResult = { error?: string; ok?: boolean; demo?: boolean };

type Resolved = { title: string; subtitle: string | null; amountBdt: number };

/**
 * Look up the real title + price for a cart item, server-side, from whichever
 * table `kind` points at — so a client can never inject its own price.
 */
async function resolveItem(kind: CartItemKind, refId: string): Promise<Resolved | null> {
  if (kind === CartItemKind.NEW_CAR) {
    const v = await prisma.newCarVariant.findUnique({
      where: { id: refId },
      include: { newCar: { include: { brand: { select: { name: true } } } } },
    });
    if (!v) return null;
    return {
      title: `${v.newCar.brand.name} ${v.newCar.model} — ${v.name}`,
      subtitle: `New car · ${v.engine}`,
      amountBdt: Number(v.priceBdt.toString()),
    };
  }

  if (kind === CartItemKind.USED_CAR) {
    const l = await prisma.usedCarListing.findUnique({ where: { id: refId } });
    if (!l || (l.status !== ListingStatus.ACTIVE && l.status !== ListingStatus.OFFER_RECEIVED)) {
      return null;
    }
    return {
      title: l.title,
      subtitle: `Used car · ${l.location}`,
      amountBdt: Number(l.priceBdt.toString()),
    };
  }

  if (kind === CartItemKind.MODIFICATION) {
    const p = await prisma.part.findUnique({ where: { id: refId } });
    if (!p) return null;
    return {
      title: `${p.brand} ${p.name}`,
      subtitle: "Modification part",
      amountBdt: Number(p.priceBdt.toString()),
    };
  }

  // RECONDITIONED — price is the estimated landed cost of the auction lot.
  const lot = await prisma.auctionCar.findUnique({
    where: { id: refId },
    include: { winningBid: true, bids: { orderBy: { amountJpy: "desc" }, take: 1 } },
  });
  if (!lot) return null;
  const bidJpy = Number(
    (lot.winningBid?.amountJpy ?? lot.bids[0]?.amountJpy ?? lot.startingPriceJpy).toString(),
  );
  const fx = await getJpyToBdt();
  const lc = await landedCostFor({
    bidJpy,
    rate: fx.rate,
    agent: null,
    pooled: false,
    engineCc: lot.engineCc,
  });
  return {
    title: `${lot.manufactureYear} ${lot.make} ${lot.model}`,
    subtitle: "Reconditioned import · est. landed cost",
    amountBdt: Math.round(lc.total),
  };
}

export async function addToCart(kind: CartItemKind, refId: string): Promise<CartResult> {
  const buyer = await requireBuyer();

  const resolved = await resolveItem(kind, refId);
  if (!resolved) return { error: "That item is no longer available." };

  const existing = await prisma.cartItem.findFirst({
    where: { buyerId: buyer.id, kind, refId, status: CartItemStatus.IN_CART },
  });
  if (existing) return { error: "That's already in your cart." };

  await prisma.cartItem.create({
    data: {
      buyerId: buyer.id,
      kind,
      refId,
      title: resolved.title,
      subtitle: resolved.subtitle,
      amountBdt: resolved.amountBdt,
    },
  });

  revalidatePath("/cart");
  revalidatePath("/", "layout"); // refresh the header cart badge
  return { ok: true };
}

export async function removeFromCart(id: string): Promise<CartResult> {
  const buyer = await requireBuyer();
  await prisma.cartItem.deleteMany({
    where: { id, buyerId: buyer.id, status: CartItemStatus.IN_CART },
  });
  revalidatePath("/cart");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Pay for everything in the cart at once. With SSLCommerz/bKash sandbox keys in
 * web/.env this would redirect to the hosted gateway for the full total. Until
 * those keys are added, checkout completes in clearly-labelled demo mode so the
 * flow is testable end-to-end — it never pretends a real gateway responded.
 */
export async function checkoutCart(): Promise<CartResult> {
  const buyer = await requireBuyer();

  const count = await prisma.cartItem.count({
    where: { buyerId: buyer.id, status: CartItemStatus.IN_CART },
  });
  if (count === 0) return { error: "Your cart is empty." };

  await prisma.cartItem.updateMany({
    where: { buyerId: buyer.id, status: CartItemStatus.IN_CART },
    data: { status: CartItemStatus.PAID, paidAt: new Date() },
  });

  revalidatePath("/cart");
  revalidatePath("/", "layout");
  return { ok: true, demo: true };
}
