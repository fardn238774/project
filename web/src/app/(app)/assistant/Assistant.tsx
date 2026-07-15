"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { askAssistant } from "@/lib/assistant-actions";
import type { Suggestion } from "@/lib/assistant/recommend";

type Turn =
  | { from: "buyer"; text: string }
  | { from: "ai"; text: string; suggestions: Suggestion[] };

const STARTERS = [
  "I want a fuel-efficient family car under 25 lakh taka, preferably Japanese, good for Dhaka traffic",
  "What about something bigger for a family of 5?",
  "Which option has the lowest total cost of ownership?",
];

const PILLAR_HREF = { New: "/new-cars", Used: "/used-cars", Reconditioned: "/auctions" } as const;

export function Assistant({ llmConfigured }: { llmConfigured: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const ask = (text: string) => {
    if (!text.trim() || pending) return;
    setTurns((t) => [...t, { from: "buyer", text }]);
    setDraft("");
    start(async () => {
      setError(null);
      const r = await askAssistant(text);
      if (r.error) {
        setError(r.error);
        return;
      }
      setTurns((t) => [
        ...t,
        { from: "ai", text: r.answer ?? "", suggestions: r.suggestions ?? [] },
      ]);
    });
  };

  return (
    <>
      {!llmConfigured && (
        <p className="mb-4 rounded-xl border border-border bg-chip p-4 text-[12.5px] leading-[1.5] text-muted">
          No LLM key is set, so requirements are read by a built-in parser rather than a model.
          The shortlist, ranking and reasoning below are real either way — they come from live
          inventory. Add <code className="font-mono">ANTHROPIC_API_KEY</code> to{" "}
          <code className="font-mono">web/.env</code> for natural-language extraction.
        </p>
      )}

      <div className="mb-4 flex flex-col gap-3">
        {turns.length === 0 && (
          <p className="text-[13px] text-muted">
            Describe what you need in plain language — I&apos;ll search new, used and
            reconditioned listings together.
          </p>
        )}

        {turns.map((turn, i) => (
          <div key={i}>
            <div className={`flex ${turn.from === "buyer" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[80%] rounded-[14px] px-4 py-3 text-sm leading-[1.55]"
                style={
                  turn.from === "buyer"
                    ? { background: "var(--accent)", color: "var(--on-accent)" }
                    : { background: "var(--chip-bg)", color: "var(--text)" }
                }
              >
                {turn.text}
              </div>
            </div>

            {turn.from === "ai" && turn.suggestions.length > 0 && (
              <div className="mt-3 grid gap-3">
                {turn.suggestions.map((s, rank) => (
                  <div key={s.id} className="rounded-2xl border border-border bg-card p-4.5">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.03em] text-dim">
                          {`#${rank + 1} · ${s.pillar}`}
                        </p>
                        <p className="text-[15px] font-bold text-text">{s.title}</p>
                      </div>
                      <p className="shrink-0 text-base font-extrabold text-accent">
                        {s.priceLabel}
                      </p>
                    </div>

                    <ul className="mb-2 grid gap-1">
                      {s.reasons.map((r) => (
                        <li key={r} className="text-[13px] text-text">
                          <span className="text-[#2f8f5f]">✓</span> {r}
                        </li>
                      ))}
                    </ul>

                    {s.tradeoffs.length > 0 && (
                      <ul className="mb-3 grid gap-1">
                        {s.tradeoffs.map((t) => (
                          <li key={t} className="text-[12.5px] text-muted">
                            <span className="text-[#a3701c]">!</span> {t}
                          </li>
                        ))}
                      </ul>
                    )}

                    <Link
                      href={s.href}
                      className="text-[13px] font-bold text-accent hover:underline"
                    >
                      {s.href === PILLAR_HREF[s.pillar]
                        ? "Browse this pillar →"
                        : "View this car →"}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {pending && <p className="text-[13px] text-muted">Searching live inventory…</p>}
        {error && <p className="text-[13px] font-semibold text-accent">{error}</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
        className="mb-4 flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. fuel-efficient family car under 25 lakh for Dhaka traffic"
          aria-label="Describe what you need"
          className="flex-1 rounded-[10px] border border-border bg-bg px-4 py-3 text-sm text-text outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending || !draft.trim()}
          className="rounded-[10px] bg-accent px-5 py-3 text-sm font-bold text-on-accent transition hover:bg-accent-hover disabled:opacity-50"
        >
          Ask
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {STARTERS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() => ask(s)}
            className="rounded-[20px] border border-border bg-card px-3.5 py-2.25 text-[13px] text-text transition hover:border-accent disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </>
  );
}
