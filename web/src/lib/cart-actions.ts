"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBuyer } from "@/lib/session";
import {
  CartItemKind,
  CartItemStatus,
  ListingStatus,
  Gateway,
  PaymentPurpose,
  PaymentStatus,
} from "@/generated/prisma/enums";
import { getJpyToBdt } from "@/lib/fx";
import { landedCostFor } from "@/lib/landed-cost-server";
import { configFor, sslcommerzInit, bkashCreate } from "@/lib/payments/gateways";

export type CartResult = {
  error?: string;
  ok?: boolean;
  demo?: boolean;
  gateway?: string;
  /** Set when a real gateway session was created — the client redirects here. */
  redirectUrl?: string;
};

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

// Paint/finish price tables — the single source of truth for what a 3D build
// costs. The configurator sends the selection; the server re-derives the price
// from these so the iframe can never post its own total.
const ALLOWED_PAINT_PRICES = new Set([0, 15000, 20000, 25000, 35000, 40000]);
const FINISH_PRICES: Record<string, number> = {
  gloss: 0,
  matte: 85000,
  metallic: 55000,
  chrome: 180000,
};

export type BuildInput = {
  carName?: string;
  paintLabel?: string;
  paintPrice?: number;
  finish?: string;
};

/**
 * Adds a 3D-configurator build to the universal cart — the same cart used by
 * new cars, used cars, reconditioned lots and parts. Prices are re-derived
 * server-side from the paint + finish selection (rims/spoilers are cosmetic in
 * the configurator and carry no charge), so a build can never inject its own
 * price. Each build is a unique customization, so it gets its own loose refId.
 */
export async function addBuildToCart(input: BuildInput): Promise<CartResult> {
  const buyer = await requireBuyer();

  const carName =
    (input.carName ?? "Custom build").toString().trim().slice(0, 60) || "Custom build";
  const finishKey = String(input.finish ?? "gloss").toLowerCase();
  const finishPrice = FINISH_PRICES[finishKey] ?? 0;
  const rawPaint = Math.round(Number(input.paintPrice));
  const paintPrice = ALLOWED_PAINT_PRICES.has(rawPaint) ? rawPaint : 0;
  const total = paintPrice + finishPrice;

  const paintLabel = (input.paintLabel ?? "").toString().trim().slice(0, 40) || "Standard paint";
  const finishLabel = finishKey.charAt(0).toUpperCase() + finishKey.slice(1);

  await prisma.cartItem.create({
    data: {
      buyerId: buyer.id,
      kind: CartItemKind.MODIFICATION,
      refId: `kaido-build-${randomUUID()}`,
      title: `Custom ${carName} build`,
      subtitle: `Paint: ${paintLabel} · ${finishLabel} finish`,
      amountBdt: total,
    },
  });

  revalidatePath("/cart");
  revalidatePath("/", "layout"); // refresh the header cart badge
  return { ok: true };
}

/**
 * Pay for everything in the cart at once, via the chosen gateway. With
 * SSLCommerz/bKash sandbox keys in web/.env this is where we'd open the gateway
 * session for the full total and redirect. Until those keys are added, checkout
 * completes in clearly-labelled demo mode so the flow is testable end-to-end —
 * it never pretends a real gateway responded.
 */
export async function checkoutCart(gatewayKey?: string): Promise<CartResult> {
  const buyer = await requireBuyer();

  const count = await prisma.cartItem.count({
    where: { buyerId: buyer.id, status: CartItemStatus.IN_CART },
  });
  if (count === 0) return { error: "Your cart is empty." };

  const gateway = gatewayKey === Gateway.BKASH ? Gateway.BKASH : Gateway.SSLCOMMERZ;
  const cfg = configFor(gateway);

  await prisma.cartItem.updateMany({
    where: { buyerId: buyer.id, status: CartItemStatus.IN_CART },
    data: { status: CartItemStatus.PAID, paidAt: new Date() },
  });

  revalidatePath("/cart");
  revalidatePath("/", "layout");
  return { ok: true, demo: !cfg.configured, gateway: cfg.label };
}

/** Absolute origin the gateway redirects back to. */
async function baseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:1398";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Starts a REAL gateway session for the whole cart and returns the hosted
 * checkout URL for the client to redirect to. A single PENDING Payment row
 * covers the cart (no item FK — a cart is a mix of pillars), and only the
 * gateway's own callback (re-validated server-side) can mark the items paid.
 *
 * If the chosen gateway has no sandbox keys in web/.env yet, it returns
 * { demo: true } so the client can fall back to the labelled demo checkout —
 * the flow stays testable, and goes live the moment the keys are added.
 */
export async function startCartCheckout(gatewayKey?: string): Promise<CartResult> {
  const buyer = await requireBuyer();

  const items = await prisma.cartItem.findMany({
    where: { buyerId: buyer.id, status: CartItemStatus.IN_CART },
  });
  if (items.length === 0) return { error: "Your cart is empty." };
  const total = Math.round(
    items.reduce((s, i) => s + Number(i.amountBdt.toString()), 0),
  );

  const gateway = gatewayKey === Gateway.BKASH ? Gateway.BKASH : Gateway.SSLCOMMERZ;
  const cfg = configFor(gateway);

  // No sandbox keys yet → let the client use the labelled demo checkout.
  if (!cfg.configured) return { demo: true, gateway: cfg.label };

  // Real gateways reject a zero amount.
  if (total <= 0) return { error: "Add a paid item before checking out with a live gateway." };

  const payment = await prisma.payment.create({
    data: {
      payerId: buyer.id,
      // A cart is a bundle across pillars; there is no single item FK. The
      // callback recognises a cart payment by the absence of an auctionCarId.
      purpose: PaymentPurpose.MODIFICATION,
      gateway,
      amountBdt: total,
      status: PaymentStatus.PENDING,
    },
  });

  const origin = await baseUrl();
  const user = await prisma.user.findUnique({ where: { id: buyer.userId } });

  const init =
    gateway === Gateway.SSLCOMMERZ
      ? await sslcommerzInit({
          tranId: payment.id,
          amountBdt: total,
          productName: `AutoBD cart — ${items.length} item${items.length === 1 ? "" : "s"}`,
          customerName: buyer.fullName,
          customerEmail: user?.email ?? "buyer@autobd.test",
          customerPhone: buyer.phone,
          baseUrl: origin,
        })
      : await bkashCreate({ tranId: payment.id, amountBdt: total, baseUrl: origin });

  if (!init.ok) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED },
    });
    return { error: init.error };
  }

  return { redirectUrl: init.redirectUrl };
}

/**
 * Marks the buyer's cart paid after a gateway callback has re-validated the
 * transaction. Only items that existed when checkout started are settled, so a
 * later-added item is never marked paid without being charged.
 */
export async function completeCartPayment(paymentId: string, gatewayTxnId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status === PaymentStatus.RELEASED) return;

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.RELEASED, gatewayTxnId },
    }),
    prisma.cartItem.updateMany({
      where: {
        buyerId: payment.payerId,
        status: CartItemStatus.IN_CART,
        createdAt: { lte: payment.createdAt },
      },
      data: { status: CartItemStatus.PAID, paidAt: new Date() },
    }),
  ]);

  revalidatePath("/cart");
  revalidatePath("/", "layout");
}
