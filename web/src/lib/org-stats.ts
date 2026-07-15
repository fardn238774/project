import { prisma } from "@/lib/prisma";

/**
 * Average time an organization takes to answer a buyer, derived from real
 * Message timestamps: for each buyer message that the org replied to, the gap
 * to that reply. The prototype hardcoded "2m".
 */
export async function avgResponseLabel(organizationId: string): Promise<string> {
  const conversations = await prisma.conversation.findMany({
    where: { organizationId },
    include: {
      buyer: { select: { userId: true } },
      messages: { orderBy: { createdAt: "asc" }, select: { senderUserId: true, createdAt: true } },
    },
  });

  const gaps: number[] = [];
  for (const convo of conversations) {
    let awaitingSince: Date | null = null;
    for (const m of convo.messages) {
      const fromBuyer = m.senderUserId === convo.buyer.userId;
      if (fromBuyer) {
        // Only the first unanswered buyer message starts the clock.
        awaitingSince ??= m.createdAt;
      } else if (awaitingSince) {
        gaps.push(m.createdAt.getTime() - awaitingSince.getTime());
        awaitingSince = null;
      }
    }
  }

  if (gaps.length === 0) return "—";

  const avgMs = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const minutes = Math.round(avgMs / 60000);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}
