"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { removeFromCart, checkoutCart } from "@/lib/cart-actions";
import { bdt } from "@/lib/format";

type Item = {
  id: string;
  kind: string;
  title: string;
  subtitle: string | null;
  amountBdt: number;
};

const KIND_LABEL: Record<string, string> = {
  NEW_CAR: "New car",
  USED_CAR: "Used car",
  RECONDITIONED: "Reconditioned",
  MODIFICATION: "Modification",
};

export function CartView({ items, total }: { items: Item[]; total: number }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div className="rounded-2xl border border-[#cfe3d6] bg-[#f4f9f6] p-7 text-center">
        <p className="text-[20px] font-extrabold text-[#2f8f5f]">Payment successful ✓</p>
        <p className="mx-auto mt-1.5 max-w-[440px] text-[13px] leading-[1.55] text-muted">
          <strong>Demo checkout</strong> — no real charge was made. Add SSLCommerz or bKash
          sandbox keys to <code className="font-mono">web/.env</code> to take live payments. Your
          orders are recorded.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-[10px] bg-accent px-5 py-2.5 text-[13px] font-bold text-on-accent"
        >
          Back to home
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm font-semibold text-text">Your cart is empty.</p>
        <p className="mx-auto mt-2 max-w-[420px] text-[13px] text-dim">
          Add a new car, a used car, a reconditioned lot or a modification part — each has an
          &ldquo;Add to cart&rdquo; button — and it&apos;ll show up here to pay together.
        </p>
      </div>
    );
  }

  const remove = (id: string) => start(async () => void (await removeFromCart(id)));
  const checkout = () =>
    start(async () => {
      setError(null);
      const r = await checkoutCart();
      if (r.error) setError(r.error);
      else setDone(true);
    });

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {items.map((it, i) => (
          <div
            key={it.id}
            className={`flex items-center justify-between gap-4 px-5 py-4 ${
              i > 0 ? "border-t border-track" : ""
            }`}
          >
            <div className="min-w-0">
              <span className="mb-1 inline-block rounded-md bg-chip px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.03em] text-dim">
                {KIND_LABEL[it.kind] ?? it.kind}
              </span>
              <p className="truncate text-[14.5px] font-bold text-text">{it.title}</p>
              {it.subtitle && <p className="truncate text-[12.5px] text-muted">{it.subtitle}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <span className="font-extrabold text-text">{bdt(it.amountBdt)}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(it.id)}
                className="text-[12px] font-bold text-[#c1442d] hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <p className="text-[12px] uppercase tracking-[0.03em] text-dim">
            Total due · {items.length} item{items.length === 1 ? "" : "s"}
          </p>
          <p className="text-[26px] font-extrabold text-accent">{bdt(total)}</p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={checkout}
          className="rounded-[11px] bg-accent px-7 py-3.5 text-[15px] font-bold text-on-accent shadow-[0_4px_14px_rgba(var(--accent-rgb),0.3)] transition hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Processing…" : `Pay all — ${bdt(total)}`}
        </button>
      </div>
      {error && <p className="mt-2 text-[13px] font-semibold text-accent">{error}</p>}
      <p className="mt-3 text-[11px] text-dim">
        Secure single checkout via SSLCommerz / bKash. (Runs in demo mode until sandbox keys are
        added to <code className="font-mono">web/.env</code>.)
      </p>
    </>
  );
}
