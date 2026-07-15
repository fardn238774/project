import { prisma } from "@/lib/prisma";

/**
 * Records that a buyer is using this organization as their agent for this lot.
 * This is what surfaces the buyer on the organization's dashboard, and what
 * the admin revenue panel derives agent commission from.
 *
 * An engagement is advisory only. It carries no bidding authority: nothing in
 * the codebase lets an organization place or raise a bid.
 */
export async function recordEngagement(
  buyerId: string,
  organizationId: string,
  auctionCarId: string,
  targetCar: string,
) {
  return prisma.engagement.upsert({
    where: {
      buyerId_organizationId_auctionCarId: { buyerId, organizationId, auctionCarId },
    },
    update: {},
    create: { buyerId, organizationId, auctionCarId, targetCar },
  });
}
