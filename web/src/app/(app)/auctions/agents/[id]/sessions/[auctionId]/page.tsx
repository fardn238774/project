import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentBuyer } from "@/lib/session";
import { jpy, km } from "@/lib/format";
import { sessionDayLabel, timeInJst } from "@/lib/time";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { WishlistButton } from "./WishlistButton";
import { LotStatus, OrgStatus } from "@/generated/prisma/client";

/** "¥620k" — the prototype's compact catalog price. */
const compactJpy = (v: number) => `¥${Math.round(v / 1000).toLocaleString("en-US")}k`;

export default async function AuctionLotsPage({
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
        lots: {
          orderBy: { lotNumber: "asc" },
          include: {
            _count: { select: { bids: true } },
            bids: { orderBy: { amountJpy: "desc" }, take: 1, select: { amountJpy: true } },
          },
        },
      },
    }),
    currentBuyer(),
  ]);

  if (!agent || agent.status !== OrgStatus.APPROVED) notFound();
  if (!auction) notFound();

  const wishlisted = buyer
    ? await prisma.wishlist.findMany({
        where: { buyerId: buyer.id, auctionCarId: { in: auction.lots.map((l) => l.id) } },
        select: { auctionCarId: true },
      })
    : [];
  const wishlistedIds = new Set(wishlisted.map((w) => w.auctionCarId));

  const liveLot = auction.lots.find((l) => l.status === LotStatus.LIVE) ?? auction.lots[0];
  const isOnAir = auction.broadcast?.isLive === true;

  return (
    <>
      <main className="mx-auto w-full max-w-[1180px] px-10 pb-30 pt-6">
        <Link
          href={`/auctions/agents/${agent.id}/sessions`}
          className="mb-4.5 block text-[13px] text-muted hover:text-text"
        >
          &larr; Back to auctions
        </Link>
        <h1 className="mb-2 text-[30px] font-extrabold tracking-[-0.01em] text-text">
          Cars in today&apos;s auction
        </h1>
        <p className="mb-2 max-w-[660px] text-[15px] text-muted">
          {`${auction.house} · ${sessionDayLabel(auction.startsAt)} ${timeInJst(auction.startsAt)} JST. Browse the lots ${agent.companyName} can bid on for you, and wishlist the ones you want them to watch.`}
        </p>
        <p className="mb-5 text-[13px] text-dim">
          {`${auction.lots.length} matching lots · ${wishlistedIds.size} wishlisted`}
        </p>

        <Link
          href={`/auctions/agents/${agent.id}/sessions/${auction.id}/telecast`}
          className="mb-6 flex items-center justify-between gap-4 rounded-[14px] border px-5 py-[15px] transition"
          style={{
            borderColor: isOnAir ? "rgba(var(--accent-rgb),0.4)" : "var(--border)",
            background: isOnAir
              ? "linear-gradient(90deg,rgba(var(--accent-rgb),0.12),var(--card-bg))"
              : "var(--card-bg)",
          }}
        >
          <div className="flex items-center gap-3.5">
            {isOnAir ? (
              <span className="flex items-center gap-[7px] rounded-md bg-[#c1442d] px-2.5 py-[5px] text-[11px] font-extrabold tracking-[0.04em] text-white">
                <span
                  className="h-[7px] w-[7px] rounded-full bg-white"
                  style={{ animation: "pulseDot 1.4s ease-in-out infinite" }}
                />
                LIVE
              </span>
            ) : (
              <span className="rounded-md bg-chip px-2.5 py-[5px] text-[11px] font-extrabold tracking-[0.04em] text-dim">
                OFFLINE
              </span>
            )}
            <div>
              <p className="text-[15px] font-bold text-text">Watch the live auction telecast</p>
              <p className="text-[12.5px] text-muted">
                {isOnAir
                  ? `${auction.house} is on air now`
                  : `${auction.house} is not broadcasting yet`}
              </p>
            </div>
          </div>
          <span className="whitespace-nowrap text-[13px] font-bold text-accent">
            {isOnAir ? "Watch now →" : "Open telecast →"}
          </span>
        </Link>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {auction.lots.map((lot) => {
            const topBid = lot.bids[0];
            return (
              <div
                key={lot.id}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="relative">
                  {lot.photoUrls.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={lot.photoUrls[0]}
                      alt={`${lot.make} ${lot.model}`}
                      className="h-[130px] w-full object-cover"
                    />
                  ) : (
                    <PhotoPlaceholder label="lot photo" height={130} radius={0} />
                  )}
                  {lot.videoUrls.length > 0 && (
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[10.5px] font-bold text-white">
                      ▶ {lot.videoUrls.length}
                    </span>
                  )}
                  <span className="absolute left-2.5 top-2.5 rounded-md bg-ink px-2 py-[3px] text-[10.5px] font-bold text-white">
                    Lot {lot.lotNumber}
                  </span>
                  <WishlistButton
                    auctionCarId={lot.id}
                    initial={wishlistedIds.has(lot.id)}
                    disabled={!buyer}
                  />
                </div>
                <div className="p-4">
                  <p className="mb-1 text-[15px] font-bold text-text">
                    {`${lot.manufactureYear} ${lot.make} ${lot.model}`}
                  </p>
                  <p className="mb-2.5 text-[13px] text-muted">
                    {`${km(lot.mileageKm)} km · Grade ${lot.grade}`}
                  </p>
                  <p className="text-sm font-extrabold text-accent">
                    {topBid
                      ? `Current ${jpy(topBid.amountJpy)}`
                      : `Start ${compactJpy(Number(lot.startingPriceJpy.toString()))}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-between gap-4 border-t border-border bg-card px-10 py-4">
        <p className="text-[13px] text-muted">
          <span className="font-bold text-text">{wishlistedIds.size}</span> wishlisted for this
          session
        </p>
        {liveLot ? (
          <Link
            href={`/auctions/agents/${agent.id}/sessions/${auction.id}/lots/${liveLot.id}`}
            className="rounded-[11px] bg-accent px-[30px] py-3.25 text-[15px] font-bold text-on-accent shadow-[0_4px_14px_rgba(var(--accent-rgb),0.3)] transition hover:bg-accent-hover"
          >
            Join live auction &rarr;
          </Link>
        ) : (
          <span className="rounded-[11px] bg-chip px-[30px] py-3.25 text-[15px] font-bold text-dim">
            No lots on the block
          </span>
        )}
      </div>
    </>
  );
}
