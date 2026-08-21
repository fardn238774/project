"use client";

import { useState, useTransition } from "react";
import { acceptOffer, rejectOffer, markSold } from "@/lib/used-car-actions";

/** Accept / decline buttons on a single received offer. */
export function OfferActions({ offerId }: { offerId: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const run = (fn: (id: string) => Promise<{ error?: string }>) =>
    start(async () => {
      setErr(null);
      const r = await fn(offerId);
      if (r?.error) setErr(r.error);
    });

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(acceptOffer)}
        className="rounded-lg bg-[#2f8f5f] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
      >
        Accept
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(rejectOffer)}
        className="rounded-lg bg-chip px-3 py-1.5 text-xs font-bold text-muted disabled:opacity-50"
      >
        Decline
      </button>
      {err && <span className="text-xs font-semibold text-accent">{err}</span>}
    </div>
  );
}

/** Seller's "mark as sold" control. */
export function MarkSoldButton({ listingId }: { listingId: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Mark this car as sold? It will be removed from the marketplace.")) return;
          start(async () => {
            setErr(null);
            const r = await markSold(listingId);
            if (r?.error) setErr(r.error);
          });
        }}
        className="rounded-[10px] bg-ink px-4 py-2.5 text-sm font-bold text-white transition hover:bg-accent hover:text-on-accent disabled:opacity-60"
      >
        {pending ? "Marking…" : "Mark as sold"}
      </button>
      {err && <p className="mt-1 text-[12px] font-semibold text-accent">{err}</p>}
    </div>
  );
}
