"use client";

import { useLiveLot } from "./live-lot-context";
import { bdt, jpy, formatRate } from "@/lib/format";
import { formatCountdown } from "@/lib/time";
import { LotStatus } from "@/generated/prisma/enums";

export function LiveStats() {
  const { state, secondsRemaining, settings } = useLiveLot();

  const bidBdt = state.currentBidJpy * state.rate;
  // Inside the anti-snipe window a late bid will push the clock out.
  const closing = secondsRemaining > 0 && secondsRemaining <= settings.antiSnipeWindowSeconds;

  return (
    <section className="mb-4 rounded-2xl border border-border bg-card p-6">
      <div className="mb-2 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label={state.hasBids ? "Current bid (JPY)" : "Starting price (JPY)"}
          value={jpy(state.currentBidJpy)}
        />
        <Stat label="Live BDT equivalent" value={bdt(bidBdt)} accent />
        <Stat
          label="Time remaining"
          value={
            state.status === LotStatus.LIVE ? formatCountdown(secondsRemaining) : "Closed"
          }
          urgent={closing}
        />
        <Stat label="Active bidders" value={String(state.activeBidders)} />
      </div>

      <p className="text-[11px] text-dim">
        {`Rate: 1 JPY ≈ ${formatRate(state.rate)} BDT`}
        {state.rateStale
          ? " · live rate unavailable, showing the last cached value"
          : " · updates live"}
      </p>

      {state.extensionCount > 0 && (
        <p className="mt-2 text-[12px] font-semibold text-accent">
          {`Anti-snipe: extended ${state.extensionCount} ${state.extensionCount === 1 ? "time" : "times"} by late bids.`}
          {state.antiSnipeWarning && " That is unusually many — flagged for review."}
        </p>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
  urgent,
}: {
  label: string;
  value: string;
  accent?: boolean;
  urgent?: boolean;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] uppercase tracking-[0.03em] text-dim">{label}</p>
      <p
        className={`text-[28px] font-extrabold tabular-nums ${
          accent || urgent ? "text-accent" : "text-text"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
