"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { bdt, jpy, formatRate } from "@/lib/format";
import { formatCountdown } from "@/lib/time";
import { BroadcastKind, LotStatus } from "@/generated/prisma/enums";
import type { LotState } from "@/lib/auction";

type LiveState = LotState & { rate: number; rateStale: boolean };

export type FeedBid = { id: string; who: string; amountJpy: number; mine: boolean };

/** Watch-only screen, so it polls a little slower than the bidding room. */
const POLL_MS = 4000;

/**
 * Turn any YouTube link — watch, youtu.be, /live/, /shorts/, or an existing
 * /embed/ — into a proper embeddable player URL. Returns null for non-YouTube
 * URLs, which are played directly as a video file. This means an admin can
 * paste a normal YouTube link and it just works, regardless of the "kind" they
 * picked.
 */
function youtubeEmbed(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
    let id = "";
    if (host === "youtu.be") {
      id = u.pathname.slice(1);
    } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v") ?? "";
      else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2] ?? "";
      else if (u.pathname.startsWith("/live/")) id = u.pathname.split("/")[2] ?? "";
      else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2] ?? "";
    }
    if (!/^[\w-]{6,}$/.test(id)) return null;
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&rel=0`;
  } catch {
    return null;
  }
}

export function TelecastView({
  lotId,
  initialState,
  initialFeed,
  lot,
  broadcast,
  joinHref,
  house,
  agentName,
}: {
  lotId: string | null;
  initialState: LiveState | null;
  initialFeed: FeedBid[];
  lot: { title: string; lotNumber: string; grade: string; km: string } | null;
  broadcast: { url: string | null; kind: BroadcastKind; isLive: boolean };
  joinHref: string | null;
  house: string;
  agentName: string;
}) {
  const [state, setState] = useState(initialState);
  const [feed, setFeed] = useState(initialFeed);
  const [seconds, setSeconds] = useState(initialState?.secondsRemaining ?? 0);

  useEffect(() => {
    if (!lotId) return;
    const poll = async () => {
      try {
        const [s, f] = await Promise.all([
          fetch(`/api/lots/${lotId}/state`, { cache: "no-store" }),
          fetch(`/api/lots/${lotId}/feed`, { cache: "no-store" }),
        ]);
        if (s.ok) {
          const next: LiveState = await s.json();
          setState(next);
          setSeconds(next.secondsRemaining);
        }
        if (f.ok) {
          const data: { bids: FeedBid[] } = await f.json();
          setFeed(data.bids);
        }
      } catch {
        // Transient network error — the next tick retries.
      }
    };
    const timer = setInterval(poll, POLL_MS);
    return () => clearInterval(timer);
  }, [lotId]);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  const onAir = broadcast.isLive && Boolean(broadcast.url);
  const embedUrl = broadcast.url ? youtubeEmbed(broadcast.url) : null;
  const bidBdt = state ? state.currentBidJpy * state.rate : 0;
  const showOverlay = onAir && state !== null && lot !== null;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
      <div>
        <div className="relative h-[400px] overflow-hidden rounded-t-2xl border border-border bg-[#0f0d0a]">
          {/* A YouTube link (in any form) plays in an iframe; anything else is
              treated as a direct video file. The stored "kind" is only a hint —
              the URL itself decides, so a pasted youtu.be link always works. */}
          {onAir && embedUrl && (
            <iframe
              src={embedUrl}
              title={`${house} live auction telecast`}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 z-1 h-full w-full border-0"
            />
          )}
          {onAir && !embedUrl && (
            // muted + playsInline are what let autoplay actually start.
            <video
              key={broadcast.url!}
              src={broadcast.url!}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 z-1 h-full w-full bg-black object-cover"
            />
          )}

          {!onAir && (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(var(--accent-rgb),0.14),transparent_62%)]" />
              <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
                <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.14em] text-dim">
                  Broadcast offline
                </p>
                <p className="mb-1.5 text-xl font-extrabold text-white">
                  Waiting for the auction house feed
                </p>
                <p className="max-w-[340px] text-[13px] text-[#c9c4ba]">
                  {`The stream appears here once an admin starts the ${house} broadcast.`}
                </p>
              </div>
            </>
          )}

          {onAir && (
            <div className="pointer-events-none absolute left-0 right-0 top-0 z-3 flex items-center justify-between p-4">
              <span className="flex items-center gap-2 rounded-md bg-[#c1442d] px-2.75 py-[5px] text-[11px] font-extrabold tracking-[0.04em] text-white">
                <span
                  className="h-[7px] w-[7px] rounded-full bg-white"
                  style={{ animation: "pulseDot 1.4s ease-in-out infinite" }}
                />
                LIVE
              </span>
            </div>
          )}

          {showOverlay && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-3 bg-[linear-gradient(0deg,rgba(0,0,0,0.82),transparent)] px-4 pb-3.5 pt-6.5">
              <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-accent">
                Now on the block
              </p>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-base font-extrabold text-white">
                    {`${lot.title} · Lot ${lot.lotNumber}`}
                  </p>
                  <p className="text-xs text-[#c9c4ba]">
                    {`Grade ${lot.grade} · ${lot.km} km · ${
                      state.status === LotStatus.LIVE
                        ? `Hammer in ${formatCountdown(seconds)}`
                        : "Closed"
                    }`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[22px] font-extrabold leading-none tabular-nums text-white">
                    {jpy(state.currentBidJpy)}
                  </p>
                  <p className="text-xs font-bold text-accent">{bdt(bidBdt)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border border-t-0 border-border bg-card px-4.5 py-3.5">
          <p className="text-[13px] text-muted">
            {state
              ? `${state.activeBidders} active ${state.activeBidders === 1 ? "bidder" : "bidders"} · 1 JPY ≈ ${formatRate(state.rate)} BDT`
              : "No lot on the block yet"}
          </p>
          {joinHref && (
            <Link
              href={joinHref}
              className="rounded-[9px] bg-accent px-5 py-2.5 text-[13.5px] font-bold text-on-accent transition hover:bg-accent-hover"
            >
              Join live auction &rarr;
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3.5 flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full bg-[#c1442d]"
              style={{ animation: "pulseDot 1.4s ease-in-out infinite" }}
            />
            <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
              Live bid feed
            </h2>
          </div>

          {feed.length === 0 ? (
            <p className="py-2 text-[13px] text-muted">
              No bids on this lot yet. The feed fills as buyers bid.
            </p>
          ) : (
            feed.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between border-b border-track py-2.5 last:border-b-0"
              >
                <span className={`text-[13px] ${b.mine ? "font-bold text-accent" : "text-text"}`}>
                  {b.who}
                </span>
                <span
                  className={`text-sm font-bold tabular-nums ${b.mine ? "text-accent" : "text-text"}`}
                >
                  {jpy(b.amountJpy)}
                </span>
              </div>
            ))
          )}
          <p className="mt-3 text-xs text-dim">{`Updated live as bids land at ${house}.`}</p>
        </div>

        {joinHref && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-1.5 text-sm font-bold text-text">Ready to bid?</p>
            <p className="mb-3.5 text-[13px] leading-[1.55] text-muted">
              {`Join the live room to chat with ${agentName} and place bids in real time.`}
            </p>
            <Link
              href={joinHref}
              className="block rounded-[10px] bg-ink py-3 text-center text-sm font-bold text-white transition hover:bg-accent hover:text-on-accent"
            >
              Join live auction &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
