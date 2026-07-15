"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { submitRating, fileDispute } from "@/lib/rating-actions";

const DIMS = [
  { key: "communication", label: "Communication" },
  { key: "gradingAccuracy", label: "Grading accuracy" },
  { key: "timeliness", label: "Timeliness" },
  { key: "overallValue", label: "Overall value" },
] as const;

type Scores = Record<(typeof DIMS)[number]["key"], number>;

export function RatingForm({
  auctionCarId,
  organizationId,
  agentName,
  existing,
  hasOpenDispute,
}: {
  auctionCarId: string;
  organizationId: string;
  agentName: string;
  existing: (Scores & { comment: string | null }) | null;
  hasOpenDispute: boolean;
}) {
  const [pending, start] = useTransition();
  const [scores, setScores] = useState<Scores>(
    existing ?? { communication: 4, gradingAccuracy: 4, timeliness: 4, overallValue: 4 },
  );
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [done, setDone] = useState(existing !== null);
  const [error, setError] = useState<string | null>(null);

  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeText, setDisputeText] = useState("");
  const [disputeFiled, setDisputeFiled] = useState(hasOpenDispute);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  const save = () =>
    start(async () => {
      setError(null);
      const r = await submitRating(auctionCarId, organizationId, scores, comment);
      if (r.error) setError(r.error);
      else setDone(true);
    });

  const send = () =>
    start(async () => {
      setDisputeError(null);
      const r = await fileDispute(auctionCarId, organizationId, disputeText);
      if (r.error) setDisputeError(r.error);
      else setDisputeFiled(true);
    });

  return (
    <>
      {done ? (
        <>
          <p className="mb-4 rounded-xl border border-[#cfe3d6] bg-[#f4f9f6] p-4 text-sm font-semibold text-[#2f8f5f]">
            {`Thanks — your rating is now reflected on ${agentName}'s public profile.`}
          </p>
          <div className="mb-4 flex gap-2.5">
            <Link
              href={`/modifications?lot=${auctionCarId}`}
              className="flex-1 rounded-[10px] bg-accent py-3.25 text-center text-sm font-bold text-on-accent"
            >
              Customize your new car &rarr;
            </Link>
            <Link
              href="/"
              className="flex-1 rounded-[10px] bg-ink py-3.25 text-center text-sm font-bold text-white"
            >
              Back to home
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setDone(false)}
            className="text-[13px] text-muted hover:text-accent"
          >
            Edit my rating
          </button>
        </>
      ) : (
        <>
          <div className="mb-4 rounded-2xl border border-border bg-card p-[22px]">
            {DIMS.map((d) => (
              <div key={d.key} className="mb-4">
                <div className="mb-2 flex justify-between text-[13.5px]">
                  <label htmlFor={d.key} className="text-text">
                    {d.label}
                  </label>
                  <span className="font-bold text-text">{scores[d.key]} / 5</span>
                </div>
                <input
                  id={d.key}
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={scores[d.key]}
                  onChange={(e) => setScores({ ...scores, [d.key]: Number(e.target.value) })}
                  className="w-full accent-[var(--accent)]"
                />
              </div>
            ))}

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional — what stood out? This appears on their public profile."
              aria-label="Review comment"
              className="mb-3 min-h-[70px] w-full rounded-[9px] border border-border bg-bg p-3 text-sm text-text outline-none focus:border-accent"
            />

            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="w-full rounded-[10px] bg-accent py-3.25 text-sm font-bold text-on-accent transition hover:bg-accent-hover disabled:opacity-60"
            >
              {pending ? "Saving…" : "Submit rating"}
            </button>
            {error && <p className="mt-2 text-[13px] font-semibold text-accent">{error}</p>}
          </div>

          {!disputeOpen && !disputeFiled && (
            <button
              type="button"
              onClick={() => setDisputeOpen(true)}
              className="w-full text-center text-[13px] text-[#a3701c] hover:underline"
            >
              Something wrong with this transaction? File a dispute
            </button>
          )}
        </>
      )}

      {(disputeOpen || disputeFiled) && (
        <div className="mt-4 rounded-2xl border border-[#f0dcb8] bg-[#fdf7ec] p-5">
          <h2 className="mb-3 text-[13px] font-bold text-[#a3701c]">File a dispute</h2>
          {disputeFiled ? (
            <p className="text-[13.5px] text-[#6b4e12]">
              Dispute filed. Admin will review with full access to the chat and bid log.
            </p>
          ) : (
            <>
              <textarea
                value={disputeText}
                onChange={(e) => setDisputeText(e.target.value)}
                placeholder="e.g. Car condition significantly differs from described grade…"
                aria-label="Dispute description"
                className="mb-3 min-h-[80px] w-full rounded-[9px] border border-[#e6d9b8] bg-white p-3 text-sm text-[#6b4e12] outline-none"
              />
              <button
                type="button"
                onClick={send}
                disabled={pending}
                className="w-full rounded-[9px] bg-[#a3701c] py-3 text-[13.5px] font-bold text-white disabled:opacity-60"
              >
                {pending ? "Filing…" : "Submit to admin for review"}
              </button>
              {disputeError && (
                <p className="mt-2 text-[13px] font-semibold text-[#a3701c]">{disputeError}</p>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
