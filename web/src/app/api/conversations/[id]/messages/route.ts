import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readMessages } from "@/lib/chat";

/** Chat poll (~3-5s). Vercel's serverless runtime can't hold a WebSocket. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const convo = await prisma.conversation.findUnique({
    where: { id },
    include: {
      buyer: { select: { userId: true } },
      organization: { select: { userId: true } },
    },
  });
  if (!convo) return Response.json({ error: "Not found" }, { status: 404 });

  // A conversation is private to its two participants.
  const isParticipant =
    convo.buyer.userId === session.user.id || convo.organization.userId === session.user.id;
  if (!isParticipant) return Response.json({ error: "Forbidden" }, { status: 403 });

  const messages = await readMessages(id, session.user.id);
  return Response.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}
