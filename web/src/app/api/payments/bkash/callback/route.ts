import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { bkashExecute } from "@/lib/payments/gateways";
import { holdInEscrow } from "@/lib/escrow-actions";
import { PaymentStatus } from "@/generated/prisma/enums";

/**
 * bKash redirects here after the buyer authorises. Nothing is held until
 * /execute confirms the capture and the captured amount matches what we
 * charged — the redirect alone is not proof of payment.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const paymentID = url.searchParams.get("paymentID");
  const tranId = url.searchParams.get("payerReference");

  const payment = tranId
    ? await prisma.payment.findUnique({ where: { id: tranId } })
    : null;

  if (!payment) redirect("/?payment=unknown");

  if (status !== "success" || !paymentID) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED, gatewayRef: status ?? "cancelled" },
    });
    redirect(`/escrow/${payment.auctionCarId}?payment=failed`);
  }

  const executed = await bkashExecute(paymentID);
  const chargedAmount = Number(payment.amountBdt.toString());
  const amountMatches =
    executed.amountBdt !== undefined && Math.abs(executed.amountBdt - chargedAmount) < 1;

  if (!executed.ok || !amountMatches || !executed.trxId) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED, gatewayRef: "execute-failed" },
    });
    redirect(`/escrow/${payment.auctionCarId}?payment=invalid`);
  }

  await holdInEscrow(payment.id, executed.trxId);
  redirect(`/escrow/${payment.auctionCarId}?payment=held`);
}
