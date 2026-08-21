"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBuyer } from "@/lib/session";
import { ListingStatus } from "@/generated/prisma/enums";
import type { ChatMessage } from "@/lib/chat";

/**
 * Private buyer↔seller chat for a used-car listing. Both people are Buyer
 * accounts; a thread is (listing, interested-buyer) and the seller is the
 * listing's own seller. Transport mirrors the auction chat: the client polls
 * a read action and posts with a send action.
 */

export type ListingChatResult = { error?: string; threadId?: string };

/** Map a thread's messages for one viewer (drives bubble side + label). */
async function threadMessages(threadId: string, viewerBuyerId: string): Promise<ChatMessage[]> {
  const msgs = await prisma.listingMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { senderBuyer: { select: { id: true, fullName: true } } },
  });
  return msgs.map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    mine: m.senderBuyerId === viewerBuyerId,
    senderLabel: m.senderBuyer.fullName,
  }));
}

/** The thread if this buyer is a participant (the interested buyer OR the seller). */
async function participantThread(threadId: string, buyerId: string) {
  const thread = await prisma.listingThread.findUnique({
    where: { id: threadId },
    include: { listing: { select: { id: true, sellerId: true } } },
  });
  if (!thread) return null;
  if (thread.buyerId !== buyerId && thread.listing.sellerId !== buyerId) return null;
  return thread;
}

/** A buyer messages the seller about a listing — finds or creates their thread. */
export async function messageSeller(listingId: string, body: string): Promise<ListingChatResult> {
  const me = await requireBuyer();
  const text = body.trim();
  if (!text) return { error: "Type a message first." };

  const listing = await prisma.usedCarListing.findUnique({
    where: { id: listingId },
    select: { sellerId: true, status: true },
  });
  if (!listing) return { error: "That listing no longer exists." };
  if (listing.sellerId === me.id) return { error: "This is your own listing." };
  if (
    listing.status !== ListingStatus.ACTIVE &&
    listing.status !== ListingStatus.OFFER_RECEIVED
  ) {
    return { error: "This listing isn't open for messages." };
  }

  const thread = await prisma.listingThread.upsert({
    where: { listingId_buyerId: { listingId, buyerId: me.id } },
    update: {},
    create: { listingId, buyerId: me.id },
  });
  await prisma.listingMessage.create({
    data: { threadId: thread.id, senderBuyerId: me.id, body: text },
  });

  revalidatePath(`/used-cars/${listingId}`);
  revalidatePath("/used-cars/seller");
  return { threadId: thread.id };
}

/** The seller (or the buyer) replies in an existing thread. */
export async function replyToThread(threadId: string, body: string): Promise<ListingChatResult> {
  const me = await requireBuyer();
  const text = body.trim();
  if (!text) return { error: "Type a message first." };

  const thread = await participantThread(threadId, me.id);
  if (!thread) return { error: "You can't post in this conversation." };

  await prisma.listingMessage.create({ data: { threadId, senderBuyerId: me.id, body: text } });
  revalidatePath(`/used-cars/${thread.listing.id}`);
  revalidatePath("/used-cars/seller");
  return { threadId };
}

/** Poll target — the thread's messages for the signed-in participant. */
export async function readListingThread(
  threadId: string,
): Promise<{ messages: ChatMessage[]; error?: undefined } | { error: string }> {
  const me = await requireBuyer();
  const thread = await participantThread(threadId, me.id);
  if (!thread) return { error: "Not allowed." };
  return { messages: await threadMessages(threadId, me.id) };
}
