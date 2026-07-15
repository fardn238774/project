import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentBuyer } from "@/lib/session";
import { getJpyToBdt } from "@/lib/fx";
import { readLotState, settleLotIfEnded } from "@/lib/auction";
import { readBidFeed } from "@/lib/bid-feed";
import { km } from "@/lib/format";
import { sessionDayLabel, timeInJst } from "@/lib/time";
import { TelecastView } from "./TelecastFeed";
import { BroadcastKind, LotStatus, OrgStatus } from "@/generated/prisma/enums";

export default async function TelecastPage({
  params,
}: {
  params: Promise<{ id: string; auctionId: string }>;
}) {
  const { id, auctionId } = await params;

  const [agent, auction, buyer] = await Promise.all([
    prisma.organization.findUnique({ where: { id } }),
    prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        broadcast: true,
        lots: { orderBy: { lotNumber: "asc" } },
      },
    }),
    currentBuyer(),
  ]);

  if (!agent || agent.status !== OrgStatus.APPROVED) notFound();
  if (!auction) notFound();

  // Whatever is on the block right now drives the overlay.
  const liveLot = auction.lots.find((l) => l.status === LotStatus.LIVE) ?? null;
  if (liveLot) await settleLotIfEnded(liveLot.id);

  const [state, feed, fx] = await Promise.all([
    liveLot ? readLotState(liveLot.id) : null,
    liveLot ? readBidFeed(liveLot.id, buyer?.id ?? null) : Promise.resolve([]),
    getJpyToBdt(),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-10 pb-20 pt-6">
      <Link
        href={`/auctions/agents/${agent.id}/sessions/${auction.id}`}
        className="mb-4.5 block text-[13px] text-muted hover:text-text"
      >
        &larr; Back to lots
      </Link>
      <h1 className="mb-1.5 text-[30px] font-extrabold tracking-[-0.01em] text-text">
        Live auction telecast
      </h1>
      <p className="mb-5.5 text-sm text-muted">
        {`${auction.house} · ${sessionDayLabel(auction.startsAt)} ${timeInJst(auction.startsAt)} JST · broadcast via ${agent.companyName}`}
      </p>

      <TelecastView
        lotId={liveLot?.id ?? null}
        initialState={state ? { ...state, rate: fx.rate, rateStale: fx.stale } : null}
        initialFeed={feed}
        lot={
          liveLot
            ? {
                title: `${liveLot.make} ${liveLot.model} — ${liveLot.manufactureYear}`,
                lotNumber: liveLot.lotNumber,
                grade: liveLot.grade,
                km: km(liveLot.mileageKm),
              }
            : null
        }
        broadcast={{
          url: auction.broadcast?.url ?? null,
          kind: auction.broadcast?.kind ?? BroadcastKind.VIDEO,
          isLive: auction.broadcast?.isLive ?? false,
        }}
        joinHref={
          liveLot
            ? `/auctions/agents/${agent.id}/sessions/${auction.id}/lots/${liveLot.id}`
            : null
        }
        house={auction.house}
        agentName={agent.companyName}
      />
    </main>
  );
}
