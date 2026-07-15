"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentBuyer } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getJpyToBdt } from "@/lib/fx";
import { dutyRateFor } from "@/lib/landed-cost-server";
import { computeLandedCost } from "@/lib/landed-cost";
import { num } from "@/lib/format";
import { sslcommerzInit, bkashCreate, configFor } from "@/lib/payments/gateways";
import {
  Gateway,
  LotStatus,
  PaymentPurpose,
  PaymentStatus,
  ShipmentStage,
} from "@/generated/prisma/enums";

export type CheckoutResult = { error?: string; redirectUrl?: string };

/** Absolute origin for gateway callbacks — they call us back out-of-band. */
async function baseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Recomputes the amount due server-side. Never trust a total posted from the
 * browser — the buyer could edit it.
 */
export async function amountDueFor(auctionCarId: string, organizationId: string) {
  const [lot, org, settings, fx] = await Promise.all([
    prisma.auctionCar.findUnique({
      where: { id: auctionCarId },
      include: { winningBid: true },
    }),
    prisma.organization.findUnique({ where: { id: organizationId } }),
    getSettings(),
    getJpyToBdt(),
  ]);
  if (!lot || !org || !lot.winningBid) return null;

  const dutyRatePercent = await dutyRateFor(lot.engineCc);
  const booking = await prisma.containerBooking.findFirst({
    where: { shipment: { auctionCarId } },
  });

  const cost = computeLandedCost(
    {
      bidJpy: num(lot.winningBid.amountJpy),
      rate: fx.rate,
      agent: { feeType: org.feeType, feeValue: num(org.feeValue) },
      pooled: booking !== null,
    },
    settings,
    dutyRatePercent,
  );
  return { lot, org, cost, rate: fx.rate };
}

/**
 * Starts a real gateway session and redirects the buyer to the hosted checkout.
 * The Payment row is created PENDING; only the gateway's own callback (which we
 * re-validate server-side) can move it to HELD_IN_ESCROW.
 */
export async function startCheckout(
  auctionCarId: string,
  organizationId: string,
  gateway: Gateway,
): Promise<CheckoutResult> {
  const buyer = await currentBuyer();
  if (!buyer) return { error: "Only buyer accounts can pay." };

  const cfg = configFor(gateway);
  if (!cfg.configured) {
    return {
      error: `${cfg.label} is not configured on this deployment. Add its sandbox credentials to web/.env — see the README.`,
    };
  }

  const due = await amountDueFor(auctionCarId, organizationId);
  if (!due) return { error: "This lot has no winning bid to pay for." };

  const { lot, cost } = due;
  if (lot.status !== LotStatus.SOLD) return { error: "This lot has not been won." };
  if (lot.winningBid!.bidderId !== buyer.id) {
    return { error: "Only the winning bidder can pay for this lot." };
  }

  const existing = await prisma.payment.findFirst({
    where: {
      auctionCarId,
      payerId: buyer.id,
      status: { in: [PaymentStatus.HELD_IN_ESCROW, PaymentStatus.RELEASED] },
    },
  });
  if (existing) return { error: "This lot is already paid." };

  const payment = await prisma.payment.create({
    data: {
      payerId: buyer.id,
      purpose: PaymentPurpose.AUCTION_WIN,
      gateway,
      amountBdt: cost.total,
      status: PaymentStatus.PENDING,
      auctionCarId,
    },
  });

  const origin = await baseUrl();
  const user = await prisma.user.findUnique({ where: { id: buyer.userId } });

  const init =
    gateway === Gateway.SSLCOMMERZ
      ? await sslcommerzInit({
          tranId: payment.id,
          amountBdt: cost.total,
          productName: `${lot.make} ${lot.model} (Lot ${lot.lotNumber})`,
          customerName: buyer.fullName,
          customerEmail: user?.email ?? "buyer@autobd.test",
          customerPhone: buyer.phone,
          baseUrl: origin,
        })
      : await bkashCreate({ tranId: payment.id, amountBdt: cost.total, baseUrl: origin });

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
 * Moves a validated payment into escrow and opens the shipment. Called only
 * from a gateway callback that has been re-validated against the gateway.
 */
export async function holdInEscrow(paymentId: string, gatewayTxnId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status === PaymentStatus.HELD_IN_ESCROW) return;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.HELD_IN_ESCROW, gatewayTxnId },
    });

    await tx.escrow.upsert({
      where: { paymentId },
      update: {},
      create: {
        paymentId,
        // Buyers get a window to raise a dispute before funds release.
        disputeWindowEndsAt: new Date(Date.now() + 14 * 864e5),
      },
    });

    if (payment.auctionCarId) {
      const shipment = await tx.shipment.upsert({
        where: { auctionCarId: payment.auctionCarId },
        update: { stage: ShipmentStage.PAYMENT_RECEIVED },
        create: {
          buyerId: payment.payerId,
          auctionCarId: payment.auctionCarId,
          stage: ShipmentStage.PAYMENT_RECEIVED,
        },
      });
      await tx.shipmentEvent.createMany({
        data: [
          { shipmentId: shipment.id, stage: ShipmentStage.WIN_CONFIRMED },
          { shipmentId: shipment.id, stage: ShipmentStage.PAYMENT_RECEIVED },
        ],
      });
    }
  });

  revalidatePath("/escrow", "layout");
  revalidatePath("/shipment", "layout");
}
