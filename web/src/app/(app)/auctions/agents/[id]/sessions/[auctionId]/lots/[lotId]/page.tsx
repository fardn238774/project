import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { currentBuyer } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getJpyToBdt } from "@/lib/fx";
import { dutyRateFor } from "@/lib/landed-cost-server";
import { readLotState, settleLotIfEnded } from "@/lib/auction";
import { findOrCreateConversation, readMessages } from "@/lib/chat";
import { recordEngagement } from "@/lib/engagements";
import { brtaPaperValue } from "@/lib/brta";
import { openContainerFor } from "@/lib/containers";
import { num, km } from "@/lib/format";
import { sessionDayLabel, timeInJst } from "@/lib/time";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { ChatPanel } from "@/components/ChatPanel";
import { LiveLotProvider } from "./live-lot-context";
import { LiveStats } from "./LiveStats";
import { BidControls } from "./BidControls";
import { CostSidebar } from "./CostSidebar";
import { OrgStatus } from "@/generated/prisma/enums";

export default async function BiddingPage({
  params,
}: {
  params: Promise<{ id: string; auctionId: string; lotId: string }>;
}) {
  const { id, auctionId, lotId } = await params;

  // Settle first so the screen never renders a lot whose clock has run out.
  await settleLotIfEnded(lotId);

  const [session, agent, lot, buyer, settings, fx] = await Promise.all([
    auth(),
    prisma.organization.findUnique({ where: { id } }),
    prisma.auctionCar.findUnique({ where: { id: lotId }, include: { auction: true } }),
    currentBuyer(),
    getSettings(),
    getJpyToBdt(),
  ]);

  if (!agent || agent.status !== OrgStatus.APPROVED) notFound();
  if (!lot || lot.auctionId !== auctionId) notFound();

  const [state, dutyRatePercent, pool] = await Promise.all([
    readLotState(lotId),
    dutyRateFor(lot.engineCc),
    openContainerFor(settings.containerCapacity),
  ]);
  if (!state) notFound();

  // Buyers get a real thread with the agent they picked. Non-buyers (an admin
  // looking at the screen) get no chat rather than a fake one.
  let conversationId: string | null = null;
  let initialMessages: Awaited<ReturnType<typeof readMessages>> = [];
  if (buyer && session?.user?.id) {
    // Reaching this screen through an agent IS the engagement — it is what puts
    // the buyer on that agent's dashboard. Idempotent on the unique key.
    await recordEngagement(buyer.id, agent.id, lot.id, `${lot.make} ${lot.model}`);

    const convo = await findOrCreateConversation(lotId, buyer.id, agent.id);
    conversationId = convo.id;
    initialMessages = await readMessages(convo.id, session.user.id);
  }

  const paper = brtaPaperValue(lot.manufactureYear, settings.importEligibilityMaxAgeYears);

  return (
    <main className="mx-auto w-full max-w-[1280px] px-10 pb-20 pt-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link
          href={`/auctions/agents/${agent.id}/sessions/${auctionId}`}
          className="text-[13px] text-muted hover:text-text"
        >
          &larr; Back
        </Link>
        <span className="h-3.5 w-px bg-border" />
        <p className="text-[13px] text-muted">
          Agent: <span className="font-bold text-text">{agent.companyName}</span>
        </p>
        <span className="h-3.5 w-px bg-border" />
        <p className="text-[13px] text-muted">
          Auction:{" "}
          <span className="font-bold text-text">
            {`${lot.auction.house} · ${sessionDayLabel(lot.auction.startsAt)} ${timeInJst(lot.auction.startsAt)} JST`}
          </span>
        </p>
        <span className="ml-auto flex items-center gap-1.5 rounded-[20px] bg-accent-tint px-3 py-1.5 text-xs font-bold text-accent">
          <span
            className="h-[7px] w-[7px] rounded-full bg-accent"
            style={{ animation: "pulseDot 1.4s ease-in-out infinite" }}
          />
          Live Auction
        </span>
      </div>

      <LiveLotProvider
        lotId={lot.id}
        initialState={{ ...state, rate: fx.rate, rateStale: fx.stale }}
        settings={{
          shippingFlatBdt: settings.shippingFlatBdt,
          portHandlingBdt: settings.portHandlingBdt,
          poolingDiscountPercent: settings.poolingDiscountPercent,
          minBidIncrementJpy: settings.minBidIncrementJpy,
          antiSnipeWindowSeconds: settings.antiSnipeWindowSeconds,
          antiSnipeExtendSeconds: settings.antiSnipeExtendSeconds,
        }}
      >
        <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-card">
              {lot.photoUrls.length > 0 ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={lot.photoUrls[0]}
                    alt={`${lot.make} ${lot.model}`}
                    className="h-[260px] w-full object-cover"
                  />
                  {lot.photoUrls.length > 1 && (
                    <div className="flex flex-wrap gap-2 p-3">
                      {lot.photoUrls.slice(1).map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={src}
                          alt={`${lot.make} ${lot.model} photo ${i + 2}`}
                          className="h-16 w-24 rounded-lg border border-border object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <PhotoPlaceholder label="auction lot photo — 4 angles" height={220} radius={0} />
              )}
              {lot.videoUrls.length > 0 && (
                <div className="grid gap-2.5 p-3 sm:grid-cols-2">
                  {lot.videoUrls.map((src, i) => (
                    <video
                      key={i}
                      controls
                      playsInline
                      preload="metadata"
                      src={src}
                      className="w-full rounded-lg border border-border bg-black"
                    />
                  ))}
                </div>
              )}
              <div className="p-5">
                <div className="mb-3.5 flex items-start justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-extrabold text-text">
                      {`${lot.make} ${lot.model} — ${lot.manufactureYear}`}
                    </h1>
                    <p className="text-[13px] text-muted">
                      {`${km(lot.mileageKm)} km · ${lot.auction.house} · Lot ${lot.lotNumber}`}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-[10px] bg-ink px-3.5 py-1.5 text-[22px] font-extrabold text-white">
                    {lot.grade}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Chip>{`Engine: ${lot.engineCc.toLocaleString("en-US")} cc`}</Chip>
                  <Chip>{`Auction grade: ${lot.grade}`}</Chip>
                  <Chip>{`${lot.manufactureYear} model · import-eligible`}</Chip>
                </div>
              </div>
            </div>

            <LiveStats />

            <div className="mb-4">
              <BidControls
                lotId={lot.id}
                buyerId={buyer?.id ?? null}
                agentName={agent.companyName}
                paymentHref={`/escrow/${lot.id}?agent=${agent.id}`}
              />
            </div>

            {conversationId ? (
              <ChatPanel
                conversationId={conversationId}
                initialMessages={initialMessages}
                title={`Chat with ${agent.companyName}`}
                emptyHint={`Ask ${agent.companyName} about the auction sheet, grading, or your ceiling.`}
              />
            ) : (
              <p className="rounded-2xl border border-border bg-card p-5 text-[13px] text-muted">
                Chat with the agent is available on buyer accounts.
              </p>
            )}
          </div>

          <CostSidebar
            agent={{
              name: agent.companyName,
              feeType: agent.feeType,
              feeValue: num(agent.feeValue),
            }}
            dutyRatePercent={dutyRatePercent}
            brta={{ label: paper.label, pct: paper.pct }}
            pool={pool}
          />
        </div>
      </LiveLotProvider>
    </main>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-lg bg-chip px-2.5 py-1.5 text-xs text-text">{children}</span>;
}
