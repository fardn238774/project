import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireBuyer } from "@/lib/session";
import { amountDueFor } from "@/lib/escrow-actions";
import { gatewayConfigs } from "@/lib/payments/gateways";
import { bdt } from "@/lib/format";
import { shortDate } from "@/lib/time";
import { CheckoutButtons } from "./CheckoutButtons";
import { PaymentStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Escrow payment — AutoBD" };

const NOTICE: Record<string, { tone: "good" | "bad"; text: string }> = {
  held: { tone: "good", text: "Payment confirmed and held in escrow." },
  failed: { tone: "bad", text: "The gateway reported the payment did not complete." },
  invalid: {
    tone: "bad",
    text: "The gateway could not validate that transaction, so nothing was held.",
  },
};

export default async function EscrowPage({
  params,
  searchParams,
}: {
  params: Promise<{ lotId: string }>;
  searchParams: Promise<{ agent?: string; payment?: string }>;
}) {
  const [{ lotId }, { agent: agentId, payment: paymentNotice }, buyer] = await Promise.all([
    params,
    searchParams,
    requireBuyer(),
  ]);

  // The engagement records which agent represented this buyer on this lot.
  const engagement = agentId
    ? null
    : await prisma.engagement.findFirst({
        where: { buyerId: buyer.id, auctionCarId: lotId },
        orderBy: { createdAt: "desc" },
      });
  const organizationId = agentId ?? engagement?.organizationId;
  if (!organizationId) notFound();

  const due = await amountDueFor(lotId, organizationId);
  if (!due) notFound();

  const { lot, org, cost } = due;
  if (lot.winningBid!.bidderId !== buyer.id) redirect("/auctions");

  const payment = await prisma.payment.findFirst({
    where: {
      auctionCarId: lotId,
      payerId: buyer.id,
      status: { in: [PaymentStatus.HELD_IN_ESCROW, PaymentStatus.RELEASED] },
    },
    include: { escrow: true },
  });

  const notice = paymentNotice ? NOTICE[paymentNotice] : undefined;
  const paid = payment !== null;

  return (
    <main className="mx-auto w-full max-w-[640px] px-10 pb-20 pt-6">
      <h1 className="mb-1.5 text-[26px] font-extrabold text-text">Escrow payment</h1>
      <p className="mb-5.5 text-sm text-muted">
        {`Funds are held by AutoBD's escrow gateway and only released to ${org.companyName} after you confirm delivery.`}
      </p>

      {notice && (
        <p
          className="mb-4 rounded-xl border p-4 text-sm font-semibold"
          style={
            notice.tone === "good"
              ? { borderColor: "#cfe3d6", background: "#f4f9f6", color: "#2f8f5f" }
              : { borderColor: "#f0dcb8", background: "#fdf7ec", color: "#a3701c" }
          }
        >
          {notice.text}
        </p>
      )}

      <section className="mb-4 rounded-2xl border border-border bg-card p-[22px]">
        <p className="mb-3 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          {`${lot.make} ${lot.model} · Lot ${lot.lotNumber}`}
        </p>
        <Row label="Winning bid" value={bdt(cost.bidBdt)} />
        <Row label={`NBR import duty (${cost.dutyRatePercent}%)`} value={bdt(cost.duty)} />
        <Row label="Shipping" value={bdt(cost.shipping)} />
        <Row label={`Agent fee (${cost.agentFeeLabel})`} value={bdt(cost.agentFee)} />
        <Row label="Port handling" value={bdt(cost.port)} />
        <div className="flex justify-between pt-3.5 text-base">
          <span className="font-extrabold text-text">Due now</span>
          <span className="font-extrabold text-accent">{bdt(cost.total)}</span>
        </div>
      </section>

      <div className="mb-5 flex items-center gap-2.5">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: paid ? "#2f8f5f" : "#a3701c" }}
        />
        <p className="text-[13px] font-bold text-text">
          {paid ? "Funds held in escrow" : "Awaiting payment"}
        </p>
      </div>

      {paid ? (
        <>
          {payment.escrow?.disputeWindowEndsAt && (
            <p className="mb-4 text-[13px] text-muted">
              {`Escrow releases to ${org.companyName} after you confirm delivery. You can raise a dispute until ${shortDate(payment.escrow.disputeWindowEndsAt)}.`}
            </p>
          )}
          <Link
            href={`/shipment/${lot.id}`}
            className="block rounded-[11px] bg-ink py-3.5 text-center text-[15px] font-bold text-white transition hover:bg-accent hover:text-on-accent"
          >
            Track shipment &rarr;
          </Link>
        </>
      ) : (
        <CheckoutButtons
          auctionCarId={lot.id}
          organizationId={org.id}
          gateways={gatewayConfigs()}
          amountLabel={bdt(cost.total)}
        />
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-track py-2.25 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-text">{value}</span>
    </div>
  );
}
