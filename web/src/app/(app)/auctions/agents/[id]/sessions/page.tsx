import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sessionDayLabel, timeInBst, timeInJst } from "@/lib/time";
import { AuctionStatus, OrgStatus } from "@/generated/prisma/client";

export default async function AuctionSelectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [agent, auctions] = await Promise.all([
    prisma.organization.findUnique({ where: { id } }),
    prisma.auction.findMany({
      where: { status: { not: AuctionStatus.ENDED } },
      orderBy: { startsAt: "asc" },
      include: { _count: { select: { lots: true } } },
    }),
  ]);
  if (!agent || agent.status !== OrgStatus.APPROVED) notFound();

  return (
    <main className="mx-auto w-full max-w-[1180px] px-10 pb-20 pt-6">
      <Link
        href={`/auctions/agents/${agent.id}`}
        className="mb-4.5 block text-[13px] text-muted hover:text-text"
      >
        {`← Back to ${agent.companyName}`}
      </Link>
      <h1 className="mb-2 text-[30px] font-extrabold tracking-[-0.01em] text-text">
        Choose an auction session
      </h1>
      <p className="mb-2 max-w-[680px] text-[15px] text-muted">
        {`${agent.companyName} will bid for you live at these upcoming Japanese auctions. Pick the session that fits your schedule — each shows the start time in Japan (JST) and in Bangladesh (BST).`}
      </p>
      <p className="mb-7 text-[13px] text-dim">
        Times auto-converted to Bangladesh Standard Time (UTC+6)
      </p>

      {auctions.length === 0 ? (
        <p className="text-[14px] text-muted">
          No sessions scheduled. An admin schedules auctions from the admin dashboard.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {auctions.map((a) => {
            const live = a.status === AuctionStatus.LIVE;
            return (
              <div key={a.id} className="rounded-2xl border border-border bg-card p-[22px]">
                <div className="mb-3.5 flex items-start justify-between gap-3">
                  <div>
                    <p className="mb-1 text-[17px] font-bold text-text">{a.house}</p>
                    <p className="text-[12.5px] text-muted">{a.location}</p>
                  </div>
                  <span
                    className="flex shrink-0 items-center gap-1.5 rounded-[20px] px-2.5 py-[5px] text-[11px] font-bold"
                    style={
                      live
                        ? { background: "#fdecea", color: "#c1442d" }
                        : { background: "#eef2f7", color: "#5a6b7d" }
                    }
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: live ? "#c1442d" : "#5a6b7d",
                        animation: live ? "pulseDot 1.4s ease-in-out infinite" : undefined,
                      }}
                    />
                    {live ? "Live now" : "Upcoming"}
                  </span>
                </div>

                <div className="mb-3.5 grid grid-cols-3 gap-2 border-y border-track py-3.5">
                  <div>
                    <p className="text-[15px] font-bold text-text">
                      {sessionDayLabel(a.startsAt)}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.03em] text-dim">Session</p>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-text">{timeInJst(a.startsAt)} JST</p>
                    <p className="text-[11px] uppercase tracking-[0.03em] text-dim">
                      {timeInBst(a.startsAt)} your time
                    </p>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-text">{a._count.lots}</p>
                    <p className="text-[11px] uppercase tracking-[0.03em] text-dim">
                      Matching lots
                    </p>
                  </div>
                </div>

                {a._count.lots === 0 ? (
                  <p className="rounded-[9px] bg-chip py-2.75 text-center text-sm text-muted">
                    Catalog not published yet
                  </p>
                ) : (
                  <Link
                    href={`/auctions/agents/${agent.id}/sessions/${a.id}`}
                    className="block rounded-[9px] bg-ink py-2.75 text-center text-sm font-semibold text-white transition hover:bg-accent hover:text-on-accent"
                  >
                    Select this auction &rarr;
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
