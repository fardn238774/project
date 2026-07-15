"use client";

import { useLiveLot } from "./live-lot-context";
import { computeLandedCost, type AgentFee } from "@/lib/landed-cost";
import { bdt } from "@/lib/format";
import { shortDate, daysUntil } from "@/lib/time";

export type PoolOption = {
  id: string;
  originPort: string;
  destinationPort: string;
  departureDate: string;
  openSlots: number;
};

export function CostSidebar({
  agent,
  dutyRatePercent,
  brta,
  pool,
}: {
  agent: AgentFee & { name: string };
  dutyRatePercent: number;
  brta: { label: string; pct: number };
  pool: PoolOption | null;
}) {
  const { state, settings, pooled, setPooled } = useLiveLot();

  const cost = computeLandedCost(
    { bidJpy: state.currentBidJpy, rate: state.rate, agent, pooled },
    settings,
    dutyRatePercent,
  );

  return (
    <div>
      <section className="mb-4 rounded-2xl border border-border bg-card p-[22px]">
        <h2 className="mb-4 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          Unified landed cost
        </h2>

        <Row label="Bid price" value={bdt(cost.bidBdt)} />
        <Row label={`NBR import duty (${dutyRatePercent}%)`} value={bdt(cost.duty)} />
        <Row
          label={pooled ? "Shipping (pooled)" : "Shipping"}
          value={bdt(cost.shipping)}
          strike={pooled ? bdt(cost.shippingBeforeDiscount) : undefined}
        />
        <Row label={`Agent fee (${cost.agentFeeLabel})`} value={bdt(cost.agentFee)} />
        <Row label="Port handling" value={bdt(cost.port)} />

        <div className="flex justify-between pt-3.5 text-base">
          <span className="font-extrabold text-text">Total landed cost</span>
          <span className="font-extrabold tabular-nums text-accent">{bdt(cost.total)}</span>
        </div>

        <p className="mt-3 text-[11px] leading-[1.5] text-dim">
          Simplified estimate — actual NBR rates vary by vehicle type and change with annual
          budget notifications. Duty is applied to (bid + shipping) as a CIF approximation.
        </p>
      </section>

      <section className="mb-4 rounded-2xl border border-[#cfe3d6] bg-[#f4f9f6] p-5">
        <h2 className="mb-2 text-[13px] font-bold text-[#2f8f5f]">Container Pooling</h2>
        {pool ? (
          <>
            <p className="mb-3.5 text-[13.5px] leading-[1.5] text-[#1e4632]">
              {`${pool.openSlots} open ${pool.openSlots === 1 ? "slot" : "slots"} on a ${pool.originPort}→${pool.destinationPort} container departing ${shortDate(new Date(pool.departureDate))}, in ${daysUntil(new Date(pool.departureDate))} days. Joining cuts shipping by ~${settings.poolingDiscountPercent}%.`}
            </p>
            <button
              type="button"
              onClick={() => setPooled(!pooled)}
              aria-pressed={pooled}
              className="w-full rounded-[9px] border border-[#2f8f5f] py-2.5 text-[13px] font-bold transition"
              style={
                pooled
                  ? { background: "#2f8f5f", color: "#fff" }
                  : { background: "transparent", color: "#2f8f5f" }
              }
            >
              {pooled ? "Pooled shipping applied" : "Preview pooled shipping"}
            </button>
            <p className="mt-2 text-[11px] leading-[1.5] text-[#1e4632]">
              Preview only — your slot is reserved after you win the lot, per the pooling
              rules.
            </p>
          </>
        ) : (
          <p className="text-[13.5px] leading-[1.5] text-[#1e4632]">
            No open container is departing from this auction&apos;s port yet. Pooling is offered
            again once you win a lot.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-2.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          BRTA paper value
        </h2>
        <p className="mb-2.5 text-sm text-text">{brta.label}</p>
        <div className="h-2 overflow-hidden rounded-[4px] bg-track">
          <div className="h-full rounded-[4px] bg-accent" style={{ width: `${brta.pct}%` }} />
        </div>
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  strike,
}: {
  label: string;
  value: string;
  strike?: string;
}) {
  return (
    <div className="flex justify-between border-b border-track py-2.25 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-semibold tabular-nums text-text">
        {strike && <s className="mr-1.5 font-normal text-dim">{strike}</s>}
        {value}
      </span>
    </div>
  );
}
