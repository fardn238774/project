"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useLiveLot } from "./live-lot-context";
import { placeBid } from "@/lib/bid-actions";
import { jpy } from "@/lib/format";
import { LotStatus } from "@/generated/prisma/enums";

/** The prototype's quick-bid step. */
const QUICK_STEP = 25000;

export function BidControls({
  lotId,
  buyerId,
  agentName,
  paymentHref,
}: {
  lotId: string;
  buyerId: string | null;
  agentName: string;
  paymentHref: string;
}) {
  const { state, secondsRemaining, settings, refresh } = useLiveLot();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [custom, setCustom] = useState("");

  const isOpen = state.status === LotStatus.LIVE && secondsRemaining > 0;
  const iAmTopBidder = buyerId !== null && state.topBidderId === buyerId;

  const bid = (amount: number) => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await placeBid(lotId, amount);
      if (result.error) setError(result.error);
      else if (result.extendedBySeconds) {
        setNotice(
          `Bid accepted with ${jpy(amount)} — it landed inside the final ${settings.antiSnipeWindowSeconds}s, so the clock extended by ${settings.antiSnipeExtendSeconds}s.`,
        );
      } else {
        setNotice(`Bid accepted at ${jpy(amount)}.`);
      }
      setCustom("");
      await refresh();
    });
  };

  if (!buyerId) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-[13px] text-muted">
          Bidding is available on buyer accounts. Organizations advise their buyers and never
          place bids themselves, so the price can only move through a real buyer&apos;s bid.
        </p>
      </section>
    );
  }

  if (state.status === LotStatus.SOLD) {
    return (
      <section className="rounded-2xl border border-[#cfe3d6] bg-[#f4f9f6] p-5">
        <p className="mb-3 text-sm font-bold text-[#1e6b42]">
          {iAmTopBidder
            ? `You won this lot at ${jpy(state.currentBidJpy)}.`
            : `This lot sold at ${jpy(state.currentBidJpy)}.`}
        </p>
        {iAmTopBidder && (
          <Link
            href={paymentHref}
            className="block rounded-[9px] bg-[#2f8f5f] py-3 text-center text-[13.5px] font-bold text-white"
          >
            Proceed to payment &amp; escrow &rarr;
          </Link>
        )}
      </section>
    );
  }

  if (state.status === LotStatus.NO_SALE) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-text">
          This lot closed without meeting its reserve — no sale.
        </p>
        <p className="mt-1 text-[13px] text-muted">
          {`${agentName} can watch for the same model at the next session.`}
        </p>
      </section>
    );
  }

  const quickAmount = Math.max(state.minNextBidJpy, state.currentBidJpy + QUICK_STEP);
  const customAmount = Number(custom.replace(/[^\d]/g, ""));
  const customValid = Number.isFinite(customAmount) && customAmount >= state.minNextBidJpy;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
        Place a bid
      </h2>
      <p className="mb-3.5 text-[13px] text-muted">
        {`Minimum next bid ${jpy(state.minNextBidJpy)} · increment ${jpy(settings.minBidIncrementJpy)}`}
        {iAmTopBidder && " · you are the top bidder"}
      </p>

      <div className="mb-3.5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!isOpen || pending}
          onClick={() => bid(state.minNextBidJpy)}
          className="rounded-[9px] bg-chip px-4 py-2.5 text-[13px] font-semibold text-text transition hover:bg-border disabled:opacity-50"
        >
          {`Bid ${jpy(state.minNextBidJpy)}`}
        </button>
        <button
          type="button"
          disabled={!isOpen || pending}
          onClick={() => bid(quickAmount)}
          className="rounded-[9px] bg-ink px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-accent hover:text-on-accent disabled:opacity-50"
        >
          {`+ ${jpy(QUICK_STEP)}`}
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (customValid) bid(customAmount);
        }}
        className="flex gap-2"
      >
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          inputMode="numeric"
          placeholder={`Your bid, min ${state.minNextBidJpy.toLocaleString("en-US")}`}
          aria-label="Custom bid amount in JPY"
          disabled={!isOpen || pending}
          className="flex-1 rounded-[9px] border border-border bg-bg px-3.5 py-2.5 text-[13.5px] text-text outline-none focus:border-accent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!isOpen || pending || !customValid}
          className="rounded-[9px] bg-accent px-5 py-2.5 text-[13px] font-bold text-on-accent transition hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Bidding…" : "Bid"}
        </button>
      </form>

      {!isOpen && (
        <p className="mt-3 text-[13px] text-muted">
          Bidding is closed for this lot.
        </p>
      )}
      {error && <p className="mt-3 text-[13px] font-semibold text-accent">{error}</p>}
      {notice && !error && (
        <p className="mt-3 text-[13px] font-semibold text-[#2f8f5f]">{notice}</p>
      )}
    </section>
  );
}
