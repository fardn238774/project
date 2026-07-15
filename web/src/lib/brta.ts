/**
 * BRTA Registration Paper Value Tracker.
 *
 * The FR asks this of "any used or reconditioned listing": how many years of
 * import-eligible registration life remain before the car ages out of common
 * resale categories. The agreed formula is
 *
 *     yearsRemaining = importEligibilityMaxAgeYears - (currentYear - manufactureYear)
 *
 * Cars past the limit are "aged out" — a real and meaningful state for a
 * domestic used listing, which (unlike an auction lot) is not blocked by the
 * import-eligibility gate.
 */
export type PaperValue = {
  yearsRemaining: number;
  /** Progress-bar fill, 0–100, scaled against the eligibility window. */
  pct: number;
  /** Years past the limit; 0 when still eligible. */
  yearsOverLimit: number;
  isAgedOut: boolean;
  label: string;
};

export function brtaPaperValue(
  manufactureYear: number,
  maxAgeYears: number,
  now: Date = new Date(),
): PaperValue {
  const age = now.getFullYear() - manufactureYear;
  const remaining = maxAgeYears - age;

  if (remaining <= 0) {
    const over = Math.abs(remaining);
    return {
      yearsRemaining: 0,
      pct: 0,
      yearsOverLimit: over,
      isAgedOut: true,
      label:
        over === 0
          ? `Aged out this year — past the ${maxAgeYears}-year import-eligibility limit`
          : `Aged out ${over} ${over === 1 ? "year" : "years"} ago — past the ${maxAgeYears}-year import-eligibility limit`,
    };
  }

  return {
    yearsRemaining: remaining,
    pct: Math.min(100, (remaining / maxAgeYears) * 100),
    yearsOverLimit: 0,
    isAgedOut: false,
    label: `${remaining} ${remaining === 1 ? "year" : "years"} import-eligible registration life remaining`,
  };
}
