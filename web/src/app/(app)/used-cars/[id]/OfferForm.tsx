"use client";

import { useActionState } from "react";
import { submitOffer, type OfferResult } from "@/lib/used-car-actions";

export function OfferForm({
  listingId,
  canOffer,
  blockedReason,
  existingOffer,
}: {
  listingId: string;
  canOffer: boolean;
  blockedReason?: string;
  /** Formatted amount of a pending offer this buyer already made. */
  existingOffer?: string;
}) {
  const [state, action, pending] = useActionState<OfferResult, FormData>(submitOffer, {});

  const sent = state.sentAmount ?? existingOffer;
  if (sent) {
    return (
      <p className="rounded-xl border border-[#cfe3d6] bg-[#f4f9f6] p-4 text-sm font-semibold text-[#2f8f5f]">
        Offer of {sent} sent to seller. If accepted, funds move to escrow automatically.
      </p>
    );
  }

  if (!canOffer) {
    return (
      <p className="rounded-2xl border border-border bg-card p-[22px] text-sm text-muted">
        {blockedReason}
      </p>
    );
  }

  return (
    <form action={action} className="rounded-2xl border border-border bg-card p-[22px]">
      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
        Make an offer
      </h2>
      <div className="flex gap-2.5">
        <input type="hidden" name="listingId" value={listingId} />
        <input
          name="amount"
          inputMode="numeric"
          placeholder="e.g. ৳20,50,000"
          aria-label="Offer amount in BDT"
          className="flex-1 rounded-[9px] border border-border bg-bg px-3.5 py-3 text-sm text-text outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-[9px] bg-accent px-[22px] py-3 text-sm font-bold text-on-accent transition hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Sending…" : "Submit offer"}
        </button>
      </div>
      {state.error && (
        <p className="mt-2.5 text-[13px] font-semibold text-accent">{state.error}</p>
      )}
    </form>
  );
}
