import { prisma } from "@/lib/prisma";

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  /** True when the signed-in user sent it — drives bubble side/colour. */
  mine: boolean;
  senderLabel: string;
};

/**
 * A conversation is scoped to (lot, buyer, organization) so a buyer talking to
 * two agents about the same lot gets two threads.
 */
export async function findOrCreateConversation(
  auctionCarId: string,
  buyerId: string,
  organizationId: string,
) {
  return prisma.conversation.upsert({
    where: {
      auctionCarId_buyerId_organizationId: { auctionCarId, buyerId, organizationId },
    },
    update: {},
    create: { auctionCarId, buyerId, organizationId },
  });
}

export async function readMessages(
  conversationId: string,
  viewerUserId: string,
): Promise<ChatMessage[]> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      sender: {
        select: {
          id: true,
          buyer: { select: { fullName: true } },
          organization: { select: { companyName: true } },
        },
      },
    },
  });

  return messages.map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    mine: m.senderUserId === viewerUserId,
    senderLabel:
      m.sender.organization?.companyName ?? m.sender.buyer?.fullName ?? "AutoBD",
  }));
}
