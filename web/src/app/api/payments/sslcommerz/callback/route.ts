import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sslcommerzValidate } from "@/lib/payments/gateways";
import { holdInEscrow } from "@/lib/escrow-actions";
import { completeCartPayment } from "@/lib/cart-actions";
import { PaymentStatus } from "@/generated/prisma/enums";

/**
 * SSLCommerz posts the buyer back here. The redirect itself proves nothing —
 * it is browser-supplied — so the transaction is re-validated against
 * SSLCommerz, and the amount is checked against what we actually charged,
 * before any money is treated as received. A cart payment (no auction lot)
 * settles the buyer's cart; an auction payment goes into escrow.
 */
async function handle(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  let tranId = url.searchParams.get("tran_id");
  let valId = url.searchParams.get("val_id");

  if (request.method === "POST") {
    const form = await request.formData();
    tranId = (form.get("tran_id") as string) ?? tranId;
    valId = (form.get("val_id") as string) ?? valId;
  }

  if (!tranId) redirect("/?payment=unknown");

  const payment = await prisma.payment.findUnique({ where: { id: tranId } });
  if (!payment) redirect("/?payment=unknown");

  // Cart payments carry no auction lot; auction payments do.
  const isCart = !payment.auctionCarId;
  const back = (reason: string) =>
    isCart ? `/cart?payment=${reason}` : `/escrow/${payment.auctionCarId}?payment=${reason}`;

  if (status !== "success" || !valId) {
    await prisma.payment.update({
      where: { id: tranId },
      data: { status: PaymentStatus.FAILED, gatewayRef: status ?? "cancelled" },
    });
    redirect(back("failed"));
  }

  const validation = await sslcommerzValidate(valId);
  const chargedAmount = Number(payment.amountBdt.toString());
  const amountMatches =
    validation.amountBdt !== undefined &&
    Math.abs(validation.amountBdt - chargedAmount) < 1;

  if (!validation.ok || !amountMatches) {
    await prisma.payment.update({
      where: { id: tranId },
      data: { status: PaymentStatus.FAILED, gatewayRef: validation.status ?? "invalid" },
    });
    redirect(back("invalid"));
  }

  if (isCart) {
    await completeCartPayment(payment.id, valId);
    redirect("/cart?payment=success");
  }

  await holdInEscrow(payment.id, valId);
  redirect(`/escrow/${payment.auctionCarId}?payment=held`);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
