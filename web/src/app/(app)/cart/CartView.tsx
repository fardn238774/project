"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { removeFromCart, checkoutCart, startCartCheckout } from "@/lib/cart-actions";
import { bdt } from "@/lib/format";

type Item = {
  id: string;
  kind: string;
  title: string;
  subtitle: string | null;
  amountBdt: number;
};

type Method = { key: string; label: string; configured: boolean };

const KIND_LABEL: Record<string, string> = {
  NEW_CAR: "New car",
  USED_CAR: "Used car",
  RECONDITIONED: "Reconditioned",
  MODIFICATION: "Modification",
};

/** Small icon per gateway so the choice reads at a glance. */
const METHOD_ICON: Record<string, string> = {
  SSLCOMMERZ: "🔒",
  BKASH: "📱",
};

export function CartView({
  items,
  total,
  methods,
}: {
  items: Item[];
  total: number;
  methods: Method[];
}) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [realPaid, setRealPaid] = useState(false);
  const [paidVia, setPaidVia] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState(methods[0]?.key ?? "SSLCOMMERZ");

  // Returning from a live gateway (SSLCommerz/bKash) lands back here with a
  // ?payment= result the callback set after re-validating the transaction.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("payment");
    if (p === "success") {
      setRealPaid(true);
      setDone(true);
    } else if (p === "failed") {
      setError("Payment was cancelled or didn't complete. Your cart is unchanged.");
    } else if (p === "invalid") {
      setError("We couldn't verify that payment with the gateway. Your cart is unchanged.");
    }
  }, []);

  if (done) {
    return (
      <div className="rounded-2xl border border-[#cfe3d6] bg-[#f4f9f6] p-7 text-center">
        <p className="text-[20px] font-extrabold text-[#2f8f5f]">
          {realPaid ? "Payment received ✓" : "Payment successful ✓"}
        </p>
        <p className="mx-auto mt-1.5 max-w-[460px] text-[13px] leading-[1.55] text-muted">
          {realPaid ? (
            <>
              Your payment was confirmed by the gateway and re-validated on our side — your order is
              recorded. Thank you!
            </>
          ) : (
            <>
              Paid via <strong>{paidVia}</strong>. <strong>Demo checkout</strong> — no real charge
              was made. Add SSLCommerz or bKash sandbox keys to{" "}
              <code className="font-mono">web/.env</code> to take live payments. Your orders are
              recorded.
            </>
          )}
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
          Add a new car, a used car, a reconditioned lot, a modification part or a 3D custom build —
          each has an &ldquo;Add to cart&rdquo; button — and it&apos;ll show up here to pay together.
        </p>
      </div>
    );
  }

  const remove = (id: string) => start(async () => void (await removeFromCart(id)));
  const checkout = () =>
    start(async () => {
      setError(null);
      const r = await startCartCheckout(method);
      if (r.error) {
        setError(r.error);
        return;
      }
      if (r.redirectUrl) {
        // Live gateway configured → go pay on the hosted SSLCommerz / bKash page.
        window.location.href = r.redirectUrl;
        return;
      }
      // No sandbox keys yet → labelled demo checkout so the flow still completes.
      const d = await checkoutCart(method);
      if (d.error) {
        setError(d.error);
      } else {
        setRealPaid(false);
        setPaidVia(d.gateway ?? methods.find((m) => m.key === method)?.label ?? "gateway");
        setDone(true);
      }
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

      {/* payment method */}
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.03em] text-dim">
          Payment method
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {methods.map((m) => {
            const active = method === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMethod(m.key)}
                aria-pressed={active}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-accent bg-accent-tint"
                    : "border-border bg-bg hover:border-accent"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-[18px]">{METHOD_ICON[m.key] ?? "💳"}</span>
                  <span>
                    <span className="block text-[14px] font-bold text-text">{m.label}</span>
                    <span className="block text-[11.5px] text-dim">
                      {m.configured ? "Sandbox ready" : "Demo mode"}
                    </span>
                  </span>
                </span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    active ? "border-accent" : "border-border"
                  }`}
                >
                  {active && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* total + pay */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
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
          {pending
            ? "Processing…"
            : `Pay ${bdt(total)} with ${methods.find((m) => m.key === method)?.label ?? "gateway"}`}
        </button>
      </div>
      {error && <p className="mt-2 text-[13px] font-semibold text-accent">{error}</p>}
      <p className="mt-3 text-[11px] text-dim">
        One universal checkout for everything in your cart — new, used, reconditioned, parts and 3D
        builds. Via SSLCommerz / bKash. (Runs in demo mode until sandbox keys are added to{" "}
        <code className="font-mono">web/.env</code>.)
      </p>
    </>
  );
}
