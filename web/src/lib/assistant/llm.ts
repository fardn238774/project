import { parseRequirements, type Requirements } from "./requirements";

/**
 * Optional LLM layer for requirement extraction.
 *
 * The FR names the OpenAI API. This implementation targets Claude's Messages
 * API instead — the provider is isolated to this one module, so swapping it is
 * a single-file change. Without a key the assistant falls back to the
 * deterministic parser and says so in the UI; the ranking, the inventory and
 * the reasoning are real either way.
 */
const MODEL = "claude-sonnet-5";
const ENDPOINT = "https://api.anthropic.com/v1/messages";

export const llmConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

const SYSTEM = `You extract car-buying requirements from a shopper's message in Bangladesh.
Reply with ONLY a JSON object, no prose, matching exactly this shape:
{"maxBudgetBdt": number|null, "minSeats": number|null, "wantsFuelEfficient": boolean,
 "wantsFamily": boolean, "wantsCityDriving": boolean, "wantsLowestTco": boolean,
 "preferredMakes": string[], "bodyHint": "SUV"|"SEDAN"|"HATCH"|null}
Budgets are in BDT; "25 lakh" is 2500000. preferredMakes uses proper case (e.g. "Toyota").`;

/** Returns extracted requirements, or null if no key / the call failed. */
export async function extractWithLlm(message: string): Promise<Requirements | null> {
  if (!llmConfigured()) return null;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: SYSTEM,
        messages: [{ role: "user", content: message }],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;

    const data: { content?: { type: string; text?: string }[] } = await res.json();
    const text = data.content?.find((c) => c.type === "text")?.text;
    if (!text) return null;

    // Be tolerant of a stray code fence around the JSON.
    const json = /\{[\s\S]*\}/.exec(text)?.[0];
    if (!json) return null;

    const parsed = JSON.parse(json) as Partial<Requirements>;
    const fallback = parseRequirements(message);

    return {
      maxBudgetBdt: parsed.maxBudgetBdt ?? fallback.maxBudgetBdt,
      minSeats: parsed.minSeats ?? fallback.minSeats,
      wantsFuelEfficient: parsed.wantsFuelEfficient ?? fallback.wantsFuelEfficient,
      wantsFamily: parsed.wantsFamily ?? fallback.wantsFamily,
      wantsCityDriving: parsed.wantsCityDriving ?? fallback.wantsCityDriving,
      wantsLowestTco: parsed.wantsLowestTco ?? fallback.wantsLowestTco,
      preferredMakes: Array.isArray(parsed.preferredMakes)
        ? parsed.preferredMakes
        : fallback.preferredMakes,
      bodyHint: parsed.bodyHint ?? fallback.bodyHint,
    };
  } catch {
    return null;
  }
}
