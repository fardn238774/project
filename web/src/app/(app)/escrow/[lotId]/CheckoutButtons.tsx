"use client";

import { useState, useTransition } from "react";
import { startCheckout } from "@/lib/escrow-actions";
import { Gateway } from "@/generated/prisma/enums";

export type GatewayOption = { gateway: Gateway; label: string; configured: boolean; sandbox: boolean };

export function CheckoutButtons({
  auctionCarId,
  organizationId,
  gateways,
  amountLabel,
}: {
  auctionCarId: string;
  organizationId: string;
  gateways: GatewayOption[];
  amountLabel: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Gateway>(
    gateways.find((g) => g.configured)?.gateway ?? Gateway.SSLCOMMERZ,
  );

  const selected = gateways.find((g) => g.gateway === chosen);

  const pay = () =>
    start(async () => {
      setError(null);
      const r = await startCheckout(auctionCarId, organizationId, chosen);
      if (r.error) setError(r.error);
      else if (r.redirectUrl) window.location.href = r.redirectUrl;
    });

  return (
    <>
      <div className="mb-5 flex gap-2.5">
        {gateways.map((g) => {
          const on = g.gateway === chosen;
          return (
            <button
              key={g.gateway}
              type="button"
              onClick={() => setChosen(g.gateway)}
              className={`flex-1 rounded-[10px] border py-3.25 text-[13px] font-bold transition ${
                on
                  ? "border-accent bg-accent-tint text-accent"
                  : "border-border bg-card text-text hover:border-accent"
              }`}
            >
              {g.label}{" "}
              <span className="text-[10px] font-semibold text-dim">
                {g.configured ? (g.sandbox ? "sandbox" : "live") : "not configured"}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={pay}
        disabled={pending || !selected?.configured}
        className="w-full rounded-[11px] bg-accent py-3.5 text-[15px] font-bold text-on-accent transition hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Opening gateway…" : `Pay ${amountLabel} into escrow`}
      </button>

      {!selected?.configured && (
        <p className="mt-2.5 text-[13px] text-muted">
          {`${selected?.label} has no credentials on this deployment. Add its sandbox keys to web/.env (see the README) — checkout deliberately refuses rather than faking a success.`}
        </p>
      )}
      {error && <p className="mt-2.5 text-[13px] font-semibold text-accent">{error}</p>}
    </>
  );
}
