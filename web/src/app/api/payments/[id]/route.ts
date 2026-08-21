import { prisma } from "@/lib/prisma";

/**
 * Assignment REST endpoint (Payments feature) — one payment's status by id.
 * Public read, database-connected.
 *
 *   GET /api/payments/<paymentId>
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const p = await prisma.payment.findUnique({ where: { id } });
  if (!p) return Response.json({ error: "Payment not found" }, { status: 404 });

  return Response.json({
    id: p.id,
    purpose: p.purpose,
    gateway: p.gateway,
    amountBdt: Number(p.amountBdt.toString()),
    status: p.status,
    gatewayRef: p.gatewayRef,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  });
}
