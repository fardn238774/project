import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrganization, requireUser } from "@/lib/session";
import { findOrCreateConversation, readMessages } from "@/lib/chat";
import { avgResponseLabel } from "@/lib/org-stats";
import { bdt, num } from "@/lib/format";
import { sessionDayLabel, timeInJst } from "@/lib/time";
import { ChatPanel } from "@/components/ChatPanel";
import { Pill } from "@/components/StatusChip";
import { EngagementStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Organization Dashboard — AutoBD" };

const STATUS_TONE = {
  [EngagementStatus.REQUESTED]: { tone: "warn", label: "New request" },
  [EngagementStatus.ACTIVE]: { tone: "good", label: "Active" },
  [EngagementStatus.COMPLETED]: { tone: "unknown", label: "Completed" },
  [EngagementStatus.DECLINED]: { tone: "unknown", label: "Declined" },
} as const;

export default async function OrgDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const [org, user, { c }] = await Promise.all([
    requireOrganization(),
    requireUser(),
    searchParams,
  ]);

  const engagements = await prisma.engagement.findMany({
    where: { organizationId: org.id, status: { not: EngagementStatus.COMPLETED } },
    orderBy: { createdAt: "desc" },
    include: {
      buyer: { select: { id: true, fullName: true, city: true } },
      auctionCar: {
        include: { auction: { select: { house: true, startsAt: true } } },
      },
    },
  });

  // Each engagement on a specific lot has a thread; create lazily so the
  // "Open chat" link always resolves. Idempotent — upsert on the unique key.
  const threads = await Promise.all(
    engagements
      .filter((e) => e.auctionCarId !== null)
      .map(async (e) => ({
        engagementId: e.id,
        conversation: await findOrCreateConversation(e.auctionCarId!, e.buyerId, org.id),
      })),
  );
  const threadFor = (engagementId: string) =>
    threads.find((t) => t.engagementId === engagementId)?.conversation;

  const selected =
    threads.find((t) => t.conversation.id === c) ?? threads[0] ?? null;
  const selectedBuyer = selected
    ? engagements.find((e) => e.id === selected.engagementId)?.buyer
    : null;
  const initialMessages = selected ? await readMessages(selected.conversation.id, user.id) : [];

  const activeCount = engagements.length;
  const responseLabel = await avgResponseLabel(org.id);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-10 pb-20 pt-8">
      <h1 className="mb-1 text-[26px] font-extrabold text-text">
        {`Welcome back, ${org.companyName}`}
      </h1>
      <p className="mb-6 text-sm text-muted">
        Buyers who selected you, their target cars, and live chats — all in one place.
      </p>

      <div className="mb-7 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard value={String(activeCount)} label="Active hire requests" />
        <StatCard
          value={org.ratingAvg === null ? "Not yet rated" : `★ ${num(org.ratingAvg).toFixed(1)}`}
          label={`Buyer rating · ${org.ratingCount} ${org.ratingCount === 1 ? "review" : "reviews"}`}
        />
        <StatCard
          value={org.successfulImports.toLocaleString("en-US")}
          label="Successful imports"
        />
        <StatCard value={responseLabel} label="Avg response time" />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1.25fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-[22px]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
              Notifications &middot; who&apos;s hiring you
            </h2>
            <span className="text-xs font-bold text-accent">{activeCount} active</span>
          </div>

          {engagements.length === 0 ? (
            <p className="py-3 text-[13px] text-dim">
              No buyers have engaged you yet. Buyers find you from the agent directory.
            </p>
          ) : (
            engagements.map((e) => {
              const s = STATUS_TONE[e.status];
              const thread = threadFor(e.id);
              return (
                <div key={e.id} className="mb-3 rounded-xl border border-border p-4 last:mb-0">
                  <div className="mb-2.5 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-bold text-text">{e.buyer.fullName}</p>
                      <p className="text-xs text-dim">{e.buyer.city ?? "Bangladesh"}</p>
                    </div>
                    <Pill tone={s.tone}>{s.label}</Pill>
                  </div>

                  <div className="mb-3 grid gap-1.5 text-[13px]">
                    <p>
                      <span className="text-dim">Target car:</span>{" "}
                      <span className="font-semibold text-text">{e.targetCar}</span>
                    </p>
                    <p>
                      <span className="text-dim">Budget:</span>{" "}
                      <span className="font-semibold text-text">
                        {e.budgetCeilingBdt === null
                          ? "Not stated"
                          : `${bdt(e.budgetCeilingBdt)} ceiling`}
                      </span>
                    </p>
                    <p>
                      <span className="text-dim">Timing:</span>{" "}
                      <span className="font-semibold text-text">
                        {e.auctionCar
                          ? `${e.auctionCar.auction.house} · ${sessionDayLabel(e.auctionCar.auction.startsAt)} ${timeInJst(e.auctionCar.auction.startsAt)} JST`
                          : "No session chosen yet"}
                      </span>
                    </p>
                    {e.auctionCar && (
                      <p>
                        <span className="text-dim">Lot:</span>{" "}
                        <span className="font-semibold text-text">
                          {`${e.auctionCar.lotNumber} · ${e.auctionCar.manufactureYear} ${e.auctionCar.make} ${e.auctionCar.model}`}
                        </span>
                      </p>
                    )}
                  </div>

                  {thread && (
                    <Link
                      href={`/org?c=${thread.id}`}
                      className="block rounded-lg bg-ink py-2 text-center text-[12.5px] font-bold text-white transition hover:bg-accent hover:text-on-accent"
                    >
                      Open chat
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </section>

        {selected && selectedBuyer ? (
          <ChatPanel
            conversationId={selected.conversation.id}
            initialMessages={initialMessages}
            title={`Live chat · ${selectedBuyer.fullName}`}
            emptyHint={`Reply to ${selectedBuyer.fullName} about grading, the auction sheet, or their ceiling.`}
          />
        ) : (
          <section className="rounded-2xl border border-border bg-card p-[22px]">
            <h2 className="mb-2 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
              Live chat
            </h2>
            <p className="text-[13px] text-muted">
              No conversations yet. Chats open once a buyer engages you on a specific lot.
            </p>
          </section>
        )}
      </div>

      <p className="mt-6 rounded-xl border border-border bg-chip p-4 text-[12.5px] leading-[1.5] text-muted">
        You advise your buyers — you never bid for them. Price moves only through a buyer&apos;s
        own bid, so there is no path here (or anywhere) for an agent to raise one.
      </p>
    </main>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[14px] border border-border bg-card p-4.5">
      <p className="text-2xl font-extrabold text-text">{value}</p>
      <p className="text-xs text-dim">{label}</p>
    </div>
  );
}
