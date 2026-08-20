"use client";

import { useState, useTransition } from "react";
import {
  reviewOrganization,
  reviewListing,
  startAuction,
  startLot,
  endAuction,
  setBroadcast,
  updateSettings,
  updateDutyBand,
} from "@/lib/admin-actions";
import { BroadcastKind } from "@/generated/prisma/enums";

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

// -------------------------------------------------------- org review buttons

export function OrgReviewButtons({ organizationId }: { organizationId: string }) {
  const { pending, error, run } = useAction();
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  if (rejecting) {
    return (
      <div className="flex flex-col items-end gap-2">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (shown to the applicant)"
          className="w-56 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => reviewOrganization(organizationId, "REJECT", reason))}
            className="rounded-lg bg-accent px-3 py-1.75 text-xs font-bold text-on-accent disabled:opacity-50"
          >
            Confirm reject
          </button>
          <button
            type="button"
            onClick={() => setRejecting(false)}
            className="rounded-lg bg-chip px-3 py-1.75 text-xs font-bold text-muted"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs font-semibold text-accent">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => reviewOrganization(organizationId, "APPROVE"))}
        className="rounded-lg bg-[#2f8f5f] px-3 py-1.75 text-xs font-bold text-white disabled:opacity-50"
      >
        Approve
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setRejecting(true)}
        className="rounded-lg bg-chip px-3 py-1.75 text-xs font-bold text-muted"
      >
        Reject
      </button>
      {error && <p className="text-xs font-semibold text-accent">{error}</p>}
    </div>
  );
}

export function OrgSuspendButton({ organizationId }: { organizationId: string }) {
  const { pending, run } = useAction();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(() => reviewOrganization(organizationId, "SUSPEND", "Suspended by admin"))}
      className="rounded-lg bg-chip px-3 py-1.75 text-xs font-bold text-muted hover:text-accent disabled:opacity-50"
    >
      Suspend
    </button>
  );
}

// -------------------------------------------------- used-car listing review

export function ListingReviewButtons({ listingId }: { listingId: string }) {
  const { pending, error, run } = useAction();
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  if (rejecting) {
    return (
      <div className="flex flex-col items-end gap-2">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (shown to the seller)"
          className="w-60 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => reviewListing(listingId, "REJECT", reason))}
            className="rounded-lg bg-accent px-3 py-1.75 text-xs font-bold text-on-accent disabled:opacity-50"
          >
            Confirm reject
          </button>
          <button
            type="button"
            onClick={() => setRejecting(false)}
            className="rounded-lg bg-chip px-3 py-1.75 text-xs font-bold text-muted"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs font-semibold text-accent">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => reviewListing(listingId, "APPROVE"))}
        className="rounded-lg bg-[#2f8f5f] px-3 py-1.75 text-xs font-bold text-white disabled:opacity-50"
      >
        {pending ? "…" : "Approve"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setRejecting(true)}
        className="rounded-lg bg-chip px-3 py-1.75 text-xs font-bold text-muted"
      >
        Reject
      </button>
      {error && <p className="text-xs font-semibold text-accent">{error}</p>}
    </div>
  );
}

// ------------------------------------------------------------- lot controls

export function StartLotButton({
  auctionCarId,
  defaultSeconds,
  label,
}: {
  auctionCarId: string;
  defaultSeconds: number;
  label: string;
}) {
  const { pending, error, run } = useAction();
  const [seconds, setSeconds] = useState(String(defaultSeconds));

  return (
    <div className="flex items-center gap-2">
      <input
        value={seconds}
        onChange={(e) => setSeconds(e.target.value)}
        inputMode="numeric"
        aria-label="Lot duration in seconds"
        className="w-20 rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none focus:border-accent"
      />
      <span className="text-xs text-dim">sec</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => startLot(auctionCarId, Number(seconds)))}
        className="rounded-lg bg-ink px-3 py-1.75 text-xs font-bold text-white hover:bg-accent hover:text-on-accent disabled:opacity-50"
      >
        {pending ? "…" : label}
      </button>
      {error && <p className="text-xs font-semibold text-accent">{error}</p>}
    </div>
  );
}

export function EndAuctionButton({ auctionId }: { auctionId: string }) {
  const { pending, run } = useAction();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(() => endAuction(auctionId))}
      className="rounded-lg bg-chip px-3 py-1.75 text-xs font-bold text-muted hover:text-accent disabled:opacity-50"
    >
      End session
    </button>
  );
}

export function StartAuctionButton({ auctionId }: { auctionId: string }) {
  const { pending, error, run } = useAction();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => startAuction(auctionId))}
        title="Flip this session live and put the next lot on the block"
        className="rounded-lg bg-[#2f8f5f] px-3 py-1.75 text-xs font-bold text-white disabled:opacity-50"
      >
        {pending ? "…" : "▶ Start auction"}
      </button>
      {error && <span className="text-xs font-semibold text-accent">{error}</span>}
    </>
  );
}

// -------------------------------------------------------- broadcast control

export function BroadcastControl({
  auctionId,
  house,
  initialUrl,
  initialKind,
  isLive,
}: {
  auctionId: string;
  house: string;
  initialUrl: string;
  initialKind: BroadcastKind;
  isLive: boolean;
}) {
  const { pending, error, run } = useAction();
  const [url, setUrl] = useState(initialUrl);
  const [kind, setKind] = useState<BroadcastKind>(initialKind);

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-text">{house}</p>
        <span
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em]"
          style={
            isLive
              ? { background: "#fdecea", color: "#c1442d" }
              : { background: "var(--chip-bg)", color: "var(--dim)" }
          }
        >
          {isLive && (
            <span
              className="h-[7px] w-[7px] rounded-full bg-[#c1442d]"
              style={{ animation: "pulseDot 1.4s ease-in-out infinite" }}
            />
          )}
          {isLive ? "ON AIR" : "OFFLINE"}
        </span>
      </div>

      <div className="mb-2.5 flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste YouTube Live embed or .mp4 stream URL…"
          aria-label={`Stream URL for ${house}`}
          className="flex-1 rounded-[9px] border border-border bg-bg px-3.5 py-2.5 text-[13.5px] text-text outline-none focus:border-accent"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as BroadcastKind)}
          aria-label="Stream type"
          className="rounded-[9px] border border-border bg-bg px-2 py-2.5 text-[13px] text-text"
        >
          <option value={BroadcastKind.VIDEO}>Video file</option>
          <option value={BroadcastKind.YOUTUBE}>YouTube</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setBroadcast(auctionId, url, kind, true))}
          className="rounded-[9px] bg-[#c1442d] px-5 py-2.5 text-[13.5px] font-bold text-white disabled:opacity-50"
        >
          Go live &rarr;
        </button>
        <button
          type="button"
          disabled={pending || !isLive}
          onClick={() => run(() => setBroadcast(auctionId, url, kind, false))}
          className="rounded-[9px] bg-chip px-4 py-2.5 text-[13px] font-bold text-muted disabled:opacity-50"
        >
          Stop broadcast
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-accent">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------- settings editor

export function SettingsForm({ values }: { values: Record<string, number> }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={(fd) =>
        start(async () => {
          setError(null);
          setSaved(false);
          const r = await updateSettings(fd);
          if (r.error) setError(r.error);
          else setSaved(true);
        })
      }
    >
      <div className="mb-3 grid gap-2.5 sm:grid-cols-2">
        {Object.entries(values).map(([key, value]) => (
          <label key={key} className="flex items-center justify-between gap-2 text-[12.5px]">
            <span className="text-muted">{key}</span>
            <input
              name={key}
              defaultValue={value}
              inputMode="numeric"
              className="w-28 rounded-lg border border-border bg-bg px-2 py-1.5 text-right text-xs text-text outline-none focus:border-accent"
            />
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-[9px] bg-ink px-4 py-2 text-[13px] font-bold text-white hover:bg-accent hover:text-on-accent disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
      {error && <p className="mt-2 text-xs font-semibold text-accent">{error}</p>}
      {saved && !error && <p className="mt-2 text-xs font-semibold text-[#2f8f5f]">Saved.</p>}
    </form>
  );
}

export function DutyRateRow({
  id,
  ccLabel,
  rate,
}: {
  id: string;
  ccLabel: string;
  rate: number;
}) {
  const { pending, error, run } = useAction();
  const [value, setValue] = useState(String(rate));

  return (
    <div className="grid grid-cols-2 items-center border-b border-track py-2.25 text-[13px]">
      <span className="text-text">{ccLabel}</span>
      <div className="flex items-center justify-end gap-1.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => Number(value) !== rate && run(() => updateDutyBand(id, Number(value)))}
          inputMode="decimal"
          aria-label={`Duty rate for ${ccLabel}`}
          className="w-16 rounded-lg border border-border bg-bg px-2 py-1 text-right text-xs font-bold text-text outline-none focus:border-accent"
        />
        <span className="text-xs text-dim">%</span>
        {pending && <span className="text-[10px] text-dim">…</span>}
        {error && <span className="text-[10px] text-accent">!</span>}
      </div>
    </div>
  );
}
