"use client";

import { useEffect, useRef, useState } from "react";
import { sendMessage } from "@/lib/chat-actions";
import type { ChatMessage } from "@/lib/chat";

/** Agreed transport: poll every 4s. Serverless can't hold a WebSocket open. */
const POLL_MS = 4000;

export function ChatPanel({
  conversationId,
  initialMessages,
  title,
  emptyHint,
}: {
  conversationId: string;
  initialMessages: ChatMessage[];
  title: string;
  emptyHint?: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data: { messages: ChatMessage[] } = await res.json();
        if (!cancelled) setMessages(data.messages);
      } catch {
        // Transient network error — the next tick retries.
      }
    };

    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [conversationId]);

  // Keep the newest message in view as the thread grows.
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
    const result = await sendMessage(conversationId, text);
    setSending(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setDraft("");

    // Don't wait up to a full poll interval to see your own message.
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data: { messages: ChatMessage[] } = await res.json();
      setMessages(data.messages);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
        {title}
      </h2>

      <div
        ref={scrollRef}
        className="mb-4 flex max-h-[220px] flex-col gap-2.5 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <p className="text-[13px] text-muted">
            {emptyHint ?? "No messages yet — say hello."}
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[70%] rounded-xl px-3.5 py-2.5 text-[13.5px] leading-[1.4]"
                style={
                  m.mine
                    ? { background: "var(--accent)", color: "var(--on-accent)" }
                    : { background: "var(--chip-bg)", color: "var(--text)" }
                }
              >
                {!m.mine && (
                  <span className="mb-0.5 block text-[11px] font-bold opacity-70">
                    {m.senderLabel}
                  </span>
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
