"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentBuyer } from "@/lib/session";
import { LotStatus } from "@/generated/prisma/enums";

export type RatingResult = { error?: string; ok?: boolean };

const clampScore = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(5, Math.max(1, Math.round(n))) : 3;
};

/** Recomputes the org's public score from its Rating rows — never invented. */
async function recomputeOrgRating(organizationId: string) {
  const agg = await prisma.rating.aggregate({
    where: { organizationId },
    _avg: { overallValue: true },
    _count: { _all: true },
  });
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ratingAvg: agg._avg.overallValue ?? null,
      ratingCount: agg._count._all,
    },
  });
}

export async function submitRating(
  auctionCarId: string,
  organizationId: string,
  scores: {
    communication: number;
    gradingAccuracy: number;
    timeliness: number;
    overallValue: number;
  },
  comment: string,
): Promise<RatingResult> {
  const buyer = await currentBuyer();
  if (!buyer) return { error: "Only buyer accounts can rate an agent." };

  // You may only rate an agent for a lot you actually won through them.
  const lot = await prisma.auctionCar.findUnique({
    where: { id: auctionCarId },
    include: { winningBid: true },
  });
  if (!lot || lot.status !== LotStatus.SOLD || lot.winningBid?.bidderId !== buyer.id) {
    return { error: "You can only rate an agent for a lot you won." };
  }

  const engagement = await prisma.engagement.findFirst({
    where: { buyerId: buyer.id, organizationId, auctionCarId },
  });
  if (!engagement) return { error: "That agent did not represent you on this lot." };

  const text = comment.trim();

  await prisma.rating.upsert({
    where: { buyerId_auctionCarId: { buyerId: buyer.id, auctionCarId } },
    update: {
      communication: clampScore(scores.communication),
      gradingAccuracy: clampScore(scores.gradingAccuracy),
      timeliness: clampScore(scores.timeliness),
      overallValue: clampScore(scores.overallValue),
      comment: text || null,
    },
    create: {
      buyerId: buyer.id,
      organizationId,
      auctionCarId,
      communication: clampScore(scores.communication),
      gradingAccuracy: clampScore(scores.gradingAccuracy),
      timeliness: clampScore(scores.timeliness),
      overallValue: clampScore(scores.overallValue),
      comment: text || null,
    },
  });

  await recomputeOrgRating(organizationId);

  revalidatePath(`/auctions/agents/${organizationId}`);
  revalidatePath("/auctions");
  revalidatePath(`/rating/${auctionCarId}`);
  return { ok: true };
}

export async function fileDispute(
  auctionCarId: string,
  organizationId: string,
  description: string,
): Promise<RatingResult> {
  const buyer = await currentBuyer();
  if (!buyer) return { error: "Only buyer accounts can file a dispute." };

  const text = description.trim();
  if (text.length < 20) {
    return { error: "Please describe the problem in a little more detail (20+ characters)." };
  }

  const engagement = await prisma.engagement.findFirst({
    where: { buyerId: buyer.id, organizationId, auctionCarId },
  });
  if (!engagement) return { error: "That agent did not represent you on this lot." };

  const open = await prisma.dispute.findFirst({
    where: { buyerId: buyer.id, auctionCarId, status: { not: "RESOLVED" } },
  });
  if (open) return { error: "You already have an open dispute on this import." };

  await prisma.dispute.create({
    data: { buyerId: buyer.id, organizationId, auctionCarId, description: text },
  });

  revalidatePath("/admin");
  revalidatePath(`/rating/${auctionCarId}`);
  return { ok: true };
}
