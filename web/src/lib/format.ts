/**
 * Formatting helpers. Output strings are matched against the prototype
 * (`../AutoBD Prototype.dc.html`) — e.g. "৳48L – 58L", "৳13.5L", "৳85,000".
 */

/** Prisma Decimal, or anything already number-ish. */
type Numeric = { toString(): string } | number | string | null | undefined;

/** Decimal instances stringify losslessly, so Number() round-trips them. */
export function num(v: Numeric): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(v.toString());
}

const LAKH = 100_000;

/** 4800000 -> "৳48L"; 1350000 -> "৳13.5L". Trailing ".0" is dropped. */
export function bdtLakh(v: Numeric): string {
  const lakh = num(v) / LAKH;
  // One decimal place, but only when it carries information.
  const s = lakh.toFixed(1).replace(/\.0$/, "");
  return `৳${s}L`;
}

/** "৳48L – 58L" — the unit is stated once, as in the prototype. */
export function bdtLakhRange(min: Numeric, max: Numeric): string {
  return `${bdtLakh(min)} – ${bdtLakh(max).replace("৳", "")}`;
}

const enIN = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** 85000 -> "৳85,000"; 2050000 -> "৳20,50,000" (Indian digit grouping). */
export function bdt(v: Numeric): string {
  return `৳${enIN.format(Math.round(num(v)))}`;
}

/** 85000 -> "৳85,000 / yr" */
export function bdtPerYear(v: Numeric): string {
  return `${bdt(v)} / yr`;
}

const enUS = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** 1250000 -> "¥1,250,000" */
export function jpy(v: Numeric): string {
  return `¥${enUS.format(Math.round(num(v)))}`;
}

/** 92000 -> "92,000" */
export function km(v: Numeric): string {
  return enUS.format(Math.round(num(v)));
}

/**
 * FX rate to 4 dp, e.g. "0.7605". Lives here rather than in fx.ts so the
 * bidding screen's client components can format the live rate without pulling
 * fx.ts's prisma import into the browser bundle.
 */
export const formatRate = (rate: number) => rate.toFixed(4);
