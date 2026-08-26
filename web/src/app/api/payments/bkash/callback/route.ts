import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { bkashExecute } from "@/lib/payments/gateways";
import { holdInEscrow } from "@/lib/escrow-actions";
import { completeCartPayment } from "@/lib/cart-actions";
import { PaymentStatus } from "@/generated/prisma/enums";

/**
 * bKash redirects here after the buyer authorises. Nothing is settled until
 * /execute confirms the capture and the captured amount matches what we
 * charged — the redirect alone is not proof of payment. A cart payment (no
 * auction lot) settles the buyer's cart; an auction payment goes into escrow.
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

  const isCart = !payment.auctionCarId;
  const back = (reason: string) =>
    isCart ? `/cart?payment=${reason}` : `/escrow/${payment.auctionCarId}?payment=${reason}`;

  if (status !== "success" || !paymentID) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED, gatewayRef: status ?? "cancelled" },
    });
    redirect(back("failed"));
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
    redirect(back("invalid"));
  }

  if (isCart) {
    await completeCartPayment(payment.id, executed.trxId);
    redirect("/cart?payment=success");
  }

  await holdInEscrow(payment.id, executed.trxId);
  redirect(`/escrow/${payment.auctionCarId}?payment=held`);
}
