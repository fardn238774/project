"use server";

import { requireUser } from "@/lib/session";
import { parseRequirements } from "@/lib/assistant/requirements";
import { extractWithLlm, llmConfigured } from "@/lib/assistant/llm";
import { recommend, type Suggestion } from "@/lib/assistant/recommend";

export type AskResult = {
  error?: string;
  answer?: string;
  suggestions?: Suggestion[];
  /** True when an LLM extracted the requirements rather than the parser. */
  usedLlm?: boolean;
};

export async function askAssistant(message: string): Promise<AskResult> {
  await requireUser();

  const text = message.trim();
  if (!text) return { error: "Tell me what you're looking for." };
  if (text.length > 1000) return { error: "That's a bit long — try summarising it." };

  const llm = await extractWithLlm(text);
  const req = llm ?? parseRequirements(text);

  const suggestions = await recommend(req);

  if (suggestions.length === 0) {
    return {
      answer:
        req.maxBudgetBdt !== null
          ? `Nothing on the platform lands under ${(req.maxBudgetBdt / 100000).toFixed(1)} lakh right now — across all three pillars. Try raising the budget, or ask again once new lots are listed.`
          : "I couldn't match anything to that. Try mentioning a budget, seats, or a make.",
      suggestions: [],
      usedLlm: llm !== null,
    };
  }

  const bits: string[] = [];
  if (req.maxBudgetBdt !== null) bits.push(`under ${(req.maxBudgetBdt / 100000).toFixed(0)} lakh`);
  if (req.minSeats !== null) bits.push(`${req.minSeats} seats`);
  if (req.wantsFuelEfficient) bits.push("fuel-efficient");
  if (req.wantsCityDriving) bits.push("city-friendly");
  if (req.preferredMakes.length) bits.push(req.preferredMakes.join("/"));

  const summary = bits.length ? bits.join(", ") : "what you described";

  return {
    answer: `Ranked ${suggestions.length} options for ${summary}, across new, used and reconditioned. Reasoning and trade-offs below come from each car's own numbers.`,
    suggestions,
    usedLlm: llm !== null,
  };
}

export async function assistantStatus() {
  return { llmConfigured: llmConfigured() };
}
