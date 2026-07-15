"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type SendMessageResult = { error?: string; ok?: boolean };

const MAX_LENGTH = 2000;

/** Posts a real Message. Only the two participants of the thread may post. */
export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<SendMessageResult> {
  const user = await requireUser();

  const text = body.trim();
  if (!text) return { error: "Type a message first." };
  if (text.length > MAX_LENGTH) return { error: "That message is too long." };

  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      buyer: { select: { userId: true } },
      organization: { select: { userId: true } },
    },
  });
  if (!convo) return { error: "That conversation no longer exists." };

  const isParticipant =
    convo.buyer.userId === user.id || convo.organization.userId === user.id;
  if (!isParticipant) return { error: "You are not part of this conversation." };

  await prisma.message.create({
    data: { conversationId, senderUserId: user.id, body: text },
  });
  return { ok: true };
}
