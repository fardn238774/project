import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getPlatformStats, getRevenueBySource } from "@/lib/analytics";
import { bdt, num } from "@/lib/format";
import { sessionDayLabel, timeInJst } from "@/lib/time";
import { feeLabel } from "@/lib/agents";
import { Pill } from "@/components/StatusChip";
import {
  OrgReviewButtons,
  OrgSuspendButton,
  StartLotButton,
  EndAuctionButton,
  BroadcastControl,
  SettingsForm,
  DutyRateRow,
} from "./AdminControls";
import {
  AuctionStatus,
  BroadcastKind,
  DisputeStatus,
  LotStatus,
  OrgStatus,
} from "@/generated/prisma/enums";

export const metadata = { title: "Admin — AutoBD" };

export default async function AdminPage() {
  await requireAdmin();

  const [stats, revenue, settings, pending, approved, disputes, auctions, dutyBands] =
    await Promise.all([
      getPlatformStats(),
      getRevenueBySource(),
      getSettings(),
      prisma.organization.findMany({
        where: { status: OrgStatus.PENDING },
        orderBy: { createdAt: "asc" },
      }),
      prisma.organization.findMany({
        where: { status: { in: [OrgStatus.APPROVED, OrgStatus.SUSPENDED] } },
        orderBy: { companyName: "asc" },
      }),
      prisma.dispute.findMany({
        where: { status: { not: DisputeStatus.RESOLVED } },
        orderBy: { createdAt: "desc" },
        include: {
          buyer: { select: { fullName: true } },
          organization: { select: { companyName: true } },
          auctionCar: { select: { make: true, model: true, lotNumber: true } },
        },
      }),
      prisma.auction.findMany({
        where: { status: { not: AuctionStatus.ENDED } },
        orderBy: { startsAt: "asc" },
        include: {
          broadcast: true,
          lots: { orderBy: { lotNumber: "asc" }, include: { _count: { select: { bids: true } } } },
        },
      }),
      prisma.dutyRate.findMany({ orderBy: { ccMin: "asc" } }),
    ]);

  const maxRevenue = Math.max(...revenue.rows.map((r) => r.value), 1);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-10 pb-20 pt-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-[26px] font-extrabold text-text">Platform Analytics &amp; Revenue</h1>
        <Link href="/" className="text-[13px] text-muted hover:text-accent">
          &larr; Exit admin, back to buyer view
        </Link>
      </div>

      <div className="mb-7 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard value={stats.activeListings.toLocaleString("en-US")} label="Total active listings" />
        <StatCard
          value={stats.bidsPlaced.toLocaleString("en-US")}
          label={`Bids placed · ${stats.winRatePercent}% of contested lots sold`}
        />
        <StatCard value={stats.successfulImports.toLocaleString("en-US")} label="Successful imports" />
        <StatCard
          value={`${stats.poolingMatchRatePercent}%`}
          label="Container pooling match rate"
        />
      </div>

      <section className="mb-6 rounded-2xl border border-border bg-card p-[22px]">
        <h2 className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          Live auction broadcast
        </h2>
        <p className="mb-4 text-[13px] text-muted">
          Broadcast a live auction feed to every buyer&apos;s telecast screen. Paste a YouTube
          Live embed URL or a direct video stream URL.
        </p>
        <div className="grid gap-3">
          {auctions.length === 0 ? (
            <p className="text-[13px] text-dim">No open sessions to broadcast.</p>
          ) : (
            auctions.map((a) => (
              <BroadcastControl
                key={a.id}
                auctionId={a.id}
                house={`${a.house} · ${sessionDayLabel(a.startsAt)} ${timeInJst(a.startsAt)} JST`}
                initialUrl={a.broadcast?.url ?? ""}
                initialKind={a.broadcast?.kind ?? BroadcastKind.VIDEO}
                isLive={a.broadcast?.isLive ?? false}
              />
            ))
          )}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-border bg-card p-[22px]">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
            Revenue by source
          </h2>
          <p className="text-[13px] font-bold text-text">{bdt(revenue.total)} total</p>
        </div>
        {revenue.rows.map((row) => (
          <div key={row.label} className="mb-3 flex items-center gap-3">
            <div className="w-[170px] shrink-0">
              <p className="text-[13px] text-text">{row.label}</p>
              <p className="text-[11px] text-dim">{row.basis}</p>
            </div>
            <div className="h-2.5 flex-1 overflow-hidden rounded-[5px] bg-track">
              <div
                className="h-full rounded-[5px] bg-accent"
                style={{ width: `${(row.value / maxRevenue) * 100}%` }}
              />
            </div>
            <p className="w-[90px] shrink-0 text-right text-[13px] font-bold text-text">
              {bdt(row.value)}
            </p>
          </div>
        ))}
        <p className="mt-3 text-[11px] text-dim">
          Volumes are real transaction counts. The commission rates behind them are placeholders
          set in platform settings below — the FR names these four sources but sets no rates.
        </p>
      </section>

      <section className="mb-6 rounded-2xl border border-border bg-card p-[22px]">
        <h2 className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          Auction &amp; lot control
        </h2>
        <p className="mb-4 text-[13px] text-muted">
          You control when a session runs and which lot is on the block. Price moves only through
          real buyer bids — there is no admin path to raise one.
        </p>
        {auctions.map((a) => (
          <div key={a.id} className="mb-3 rounded-xl border border-border p-4 last:mb-0">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-text">
                {`${a.house} · ${sessionDayLabel(a.startsAt)} ${timeInJst(a.startsAt)} JST`}
              </p>
              <div className="flex items-center gap-2">
                <Pill tone={a.status === AuctionStatus.LIVE ? "warn" : "unknown"}>
                  {a.status}
                </Pill>
                <EndAuctionButton auctionId={a.id} />
              </div>
            </div>
            {a.lots.length === 0 ? (
              <p className="text-[13px] text-dim">No lots in this catalog.</p>
            ) : (
              a.lots.map((lot) => (
                <div
                  key={lot.id}
                  className="flex items-center justify-between gap-3 border-t border-track py-2.5"
                >
                  <div>
                    <p className="text-[13px] text-text">
                      {`Lot ${lot.lotNumber} · ${lot.manufactureYear} ${lot.make} ${lot.model}`}
                    </p>
                    <p className="text-[11px] text-dim">
                      {`${lot.status} · ${lot._count.bids} ${lot._count.bids === 1 ? "bid" : "bids"}${lot.extensionCount > 0 ? ` · ${lot.extensionCount} anti-snipe extensions` : ""}`}
                    </p>
                  </div>
                  {lot.status === LotStatus.SOLD ? (
                    <Pill tone="good">Sold</Pill>
                  ) : (
                    <StartLotButton
                      auctionCarId={lot.id}
                      defaultSeconds={lot.durationSeconds}
                      label={lot.status === LotStatus.LIVE ? "Restart lot" : "Put on the block"}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <section className="mb-5 rounded-2xl border border-border bg-card p-[22px]">
            <h2 className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
              Pending bidding organization applications
            </h2>
            {pending.length === 0 ? (
              <p className="py-3 text-[13px] text-dim">No pending applications.</p>
            ) : (
              pending.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-3 border-b border-track py-3 last:border-b-0"
                >
                  <div>
                    <p className="text-sm font-bold text-text">{o.companyName}</p>
                    <p className="text-xs text-dim">
                      {`License ${o.licenseNumber} · ${o.yearsInOperation} yrs track record · ${feeLabel(o.feeType, o.feeValue)}`}
                    </p>
                  </div>
                  <OrgReviewButtons organizationId={o.id} />
                </div>
              ))
            )}

            <h2 className="mb-3.5 mt-5.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
              Approved organizations
            </h2>
            {approved.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-3 border-b border-track py-3 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-bold text-text">{o.companyName}</p>
                  <p className="text-xs text-dim">
                    {`${o.status} · ${o.ratingCount} ${o.ratingCount === 1 ? "rating" : "ratings"}${o.ratingAvg === null ? "" : ` · ★ ${num(o.ratingAvg).toFixed(1)}`}`}
                  </p>
                </div>
                {o.status === OrgStatus.SUSPENDED ? (
                  <OrgReviewButtons organizationId={o.id} />
                ) : (
                  <OrgSuspendButton organizationId={o.id} />
                )}
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-border bg-card p-[22px]">
            <h2 className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
              Active disputes
            </h2>
            {disputes.length === 0 ? (
              <p className="py-3 text-[13px] text-dim">No open disputes.</p>
            ) : (
              disputes.map((d) => (
                <div key={d.id} className="border-b border-track py-3 last:border-b-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-text">
                      {d.auctionCar
                        ? `${d.auctionCar.make} ${d.auctionCar.model} · Lot ${d.auctionCar.lotNumber}`
                        : "General dispute"}
                    </p>
                    <Pill tone="warn">{d.status}</Pill>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {`${d.buyer.fullName} vs ${d.organization.companyName} — ${d.description}`}
                  </p>
                </div>
              ))
            )}
          </section>
        </div>

        <div>
          <section className="mb-5 rounded-2xl border border-border bg-card p-[22px]">
            <h2 className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
              NBR duty rate table
            </h2>
            <div className="grid grid-cols-2 border-b border-track pb-2 text-xs text-dim">
              <span>Engine size</span>
              <span className="text-right">Duty rate</span>
            </div>
            {dutyBands.map((b) => (
              <DutyRateRow
                key={b.id}
                id={b.id}
                ccLabel={
                  b.ccMax === null
                    ? `Above ${b.ccMin - 1}cc`
                    : b.ccMin === 0
                      ? `Up to ${b.ccMax}cc`
                      : `${b.ccMin}–${b.ccMax}cc`
                }
                rate={num(b.ratePercent)}
              />
            ))}
            <p className="mt-2.5 text-[11px] text-dim">
              Updated each national budget cycle. Edits apply to every landed-cost calculation
              immediately.
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-[22px]">
            <h2 className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
              Platform settings
            </h2>
            <SettingsForm values={settings} />
          </section>
        </div>
      </div>
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
