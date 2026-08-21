import { prisma } from "@/lib/prisma";
import { PaymentStatus } from "@/generated/prisma/enums";

/**
 * Assignment REST endpoint (Payments feature) — list payments.
 * Public read, database-connected, returns JSON. Optional filter:
 * ?status=PENDING|HELD_IN_ESCROW|RELEASED|FAILED|REFUNDED
 *
 *   GET /api/payments
 *   GET /api/payments?status=HELD_IN_ESCROW
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("status");
  const status =
    raw && (Object.values(PaymentStatus) as string[]).includes(raw)
      ? (raw as PaymentStatus)
      : undefined;

  const payments = await prisma.payment.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const data = payments.map((p) => ({
    id: p.id,
    purpose: p.purpose,
    gateway: p.gateway,
    amountBdt: Number(p.amountBdt.toString()),
    status: p.status,
    createdAt: p.createdAt,
  }));

  return Response.json({ count: data.length, payments: data });
}
