"use client";

import { useState, useTransition } from "react";
import { advanceShipment, joinContainer } from "@/lib/shipment-actions";

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r.error) setError(r.error);
    });
  return { pending, error, run };
}

export function AdvanceStageButton({ shipmentId }: { shipmentId: string }) {
  const { pending, error, run } = useAction();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => advanceShipment(shipmentId))}
        className="rounded-[9px] bg-chip px-4 py-3 text-[13px] font-bold text-text transition hover:bg-border disabled:opacity-50"
      >
        {pending ? "Updating…" : "Advance stage (admin)"}
      </button>
      {error && <p className="mt-2 text-[13px] font-semibold text-accent">{error}</p>}
    </div>
  );
}

export function JoinContainerButton({
  shipmentId,
  containerId,
  label,
}: {
  shipmentId: string;
  containerId: string;
  label: string;
}) {
  const { pending, error, run } = useAction();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => joinContainer(shipmentId, containerId))}
        className="w-full rounded-[9px] border border-[#2f8f5f] py-2.5 text-[13px] font-bold text-[#2f8f5f] transition hover:bg-[#2f8f5f] hover:text-white disabled:opacity-50"
      >
        {pending ? "Booking…" : label}
      </button>
      {error && <p className="mt-2 text-[12px] font-semibold text-accent">{error}</p>}
    </div>
  );
}
