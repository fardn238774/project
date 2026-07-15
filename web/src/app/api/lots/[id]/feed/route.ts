import { auth } from "@/auth";
import { currentBuyer } from "@/lib/session";
import { readBidFeed } from "@/lib/bid-feed";

/** Anonymised live bid feed for the telecast screen. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const buyer = await currentBuyer();
  const bids = await readBidFeed(id, buyer?.id ?? null);

  return Response.json({ bids }, { headers: { "Cache-Control": "no-store" } });
}
