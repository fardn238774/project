"use client";

import { useEffect, useRef, useState } from "react";
import { messageSeller, replyToThread, readListingThread } from "@/lib/listing-chat-actions";
import type { ChatMessage } from "@/lib/chat";

/** Poll every 4s — mirrors the auction chat transport (no serverless WebSocket). */
const POLL_MS = 4000;

/**
 * Buyer↔seller chat for a used-car listing. In "buyer" mode a message finds or
 * creates the buyer's thread; in "seller" mode it replies to an existing thread.
 */
export function ListingChatPanel({
  mode,
  listingId,
  threadId: initialThreadId,
  initialMessages,
  title,
  emptyHint,
}: {
  mode: "buyer" | "seller";
  listingId: string;
  threadId: string | null;
  initialMessages: ChatMessage[];
  title: string;
  emptyHint?: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [threadId, setThreadId] = useState<string | null>(initialThreadId);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await readListingThread(threadId);
        if (!cancelled && "messages" in r) setMessages(r.messages);
      } catch {
        // transient — next tick retries
      }
    };
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [threadId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    const r =
      mode === "buyer"
        ? await messageSeller(listingId, text)
        : threadId
          ? await replyToThread(threadId, text)
          : { error: "No conversation to reply to." };
    setSending(false);

    if (r.error) {
      setError(r.error);
      return;
    }
    setDraft("");
    const tid = r.threadId ?? threadId;
    if (tid && tid !== threadId) setThreadId(tid);
    if (tid) {
      const rr = await readListingThread(tid);
      if ("messages" in rr) setMessages(rr.messages);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">{title}</h2>

      <div ref={scrollRef} className="mb-4 flex max-h-[240px] flex-col gap-2.5 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-[13px] text-muted">{emptyHint ?? "No messages yet — say hello."}</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[72%] rounded-xl px-3.5 py-2.5 text-[13.5px] leading-[1.4]"
                style={
                  m.mine
                    ? { background: "var(--accent)", color: "var(--on-accent)" }
                    : { background: "var(--chip-bg)", color: "var(--text)" }
                }
              >
                {!m.mine && (
                  <span className="mb-0.5 block text-[11px] font-bold opacity-70">{m.senderLabel}</span>
                )}
                {m.body}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          aria-label="Message"
          className="flex-1 rounded-[9px] border border-border bg-bg px-3.5 py-2.5 text-[13.5px] text-text outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="rounded-[9px] bg-ink px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-accent hover:text-on-accent disabled:opacity-50"
        >
          Send
        </button>
      </form>
      {error && <p className="mt-2 text-[12px] font-semibold text-accent">{error}</p>}
    </div>
  );
}
