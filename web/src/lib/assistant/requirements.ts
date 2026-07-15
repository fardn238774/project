/**
 * Requirements extracted from a buyer's plain-language brief.
 *
 * The FR wants an LLM to do this extraction. When an API key is configured we
 * use one (see llm.ts); this deterministic parser is the fallback so the
 * assistant still returns real, ranked results without one — rather than the
 * prototype's two canned strings.
 */
export type Requirements = {
  maxBudgetBdt: number | null;
  minSeats: number | null;
  wantsFuelEfficient: boolean;
  wantsFamily: boolean;
  wantsCityDriving: boolean;
  wantsLowestTco: boolean;
  preferredMakes: string[];
  bodyHint: "SUV" | "SEDAN" | "HATCH" | null;
};

const MAKES = ["Toyota", "Honda", "Nissan", "Mazda", "Mitsubishi", "Suzuki"];

/** "25 lakh", "25L", "৳25,00,000", "2.5m" -> BDT. */
export function parseBudget(text: string): number | null {
  const t = text.toLowerCase().replace(/,/g, "");

  const lakh = /(\d+(?:\.\d+)?)\s*(?:lakh|lac|lakhs|l\b)/.exec(t);
  if (lakh) return Number(lakh[1]) * 100_000;

  const crore = /(\d+(?:\.\d+)?)\s*(?:crore|cr\b)/.exec(t);
  if (crore) return Number(crore[1]) * 10_000_000;

  // A bare number large enough to be taka rather than a year or a seat count.
  const bare = /(?:under|below|within|budget|upto|up to|max)\D{0,10}(\d{5,9})/.exec(t);
  if (bare) return Number(bare[1]);

  return null;
}

export function parseRequirements(text: string): Requirements {
  const t = text.toLowerCase();

  const seats = /(\d+)\s*(?:seat|seater|people|persons|family of)/.exec(t);
  const familyOf = /family of\s*(\d+)/.exec(t);

  return {
    maxBudgetBdt: parseBudget(text),
    minSeats: familyOf ? Number(familyOf[1]) : seats ? Number(seats[1]) : null,
    wantsFuelEfficient: /fuel|efficien|mileage|km\/l|economy|hybrid|petrol cost/.test(t),
    wantsFamily: /family|kids|children|spacious|space/.test(t),
    wantsCityDriving: /city|dhaka|traffic|urban|commut/.test(t),
    wantsLowestTco: /cheap|lowest|total cost|ownership|tco|running cost|budget/.test(t),
    preferredMakes: MAKES.filter((m) => t.includes(m.toLowerCase())),
    bodyHint: /suv|crossover|jeep/.test(t)
      ? "SUV"
      : /sedan|saloon/.test(t)
        ? "SEDAN"
        : /hatch/.test(t)
          ? "HATCH"
          : null,
  };
}
