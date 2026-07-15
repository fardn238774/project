import { auth } from "@/auth";
import { readLotState, settleLotIfEnded } from "@/lib/auction";
import { getJpyToBdt } from "@/lib/fx";

/**
 * Live lot state for the bidding screen's poll (~3s). Chat has its own
 * endpoint; this one stays small so it is cheap to hit often.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Close the lot if its clock ran out — there is no scheduler, so reads settle.
  await settleLotIfEnded(id);

  const [state, fx] = await Promise.all([readLotState(id), getJpyToBdt()]);
  if (!state) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json(
    { ...state, rate: fx.rate, rateStale: fx.stale },
    { headers: { "Cache-Control": "no-store" } },
  );
}
