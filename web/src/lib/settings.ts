import { prisma } from "@/lib/prisma";

/**
 * Admin-editable platform settings. Defaults mirror prisma/seed.ts so a missing
 * row degrades to the agreed value rather than NaN.
 */
const DEFAULTS = {
  shippingFlatBdt: 195000,
  portHandlingBdt: 42000,
  antiSnipeWindowSeconds: 30,
  antiSnipeExtendSeconds: 60,
  antiSnipeWarnAfterExtensions: 20,
  containerCapacity: 10,
  poolingDiscountPercent: 30,
  importEligibilityMaxAgeYears: 5,
  minBidIncrementJpy: 5000,
  exchangeRateTtlMinutes: 60,

  // Commission rates behind the admin revenue breakdown. The FR names the four
  // sources but sets no rates, so these are placeholders for the business to
  // set — they are admin-editable and every revenue figure is derived from real
  // transaction rows using them.
  referralFeePerInquiryBdt: 2000,
  listingFeeBdt: 500,
  agentPlacementCutPercent: 10,
  modSourcingMarginPercent: 8,
} as const;

export type SettingKey = keyof typeof DEFAULTS;
export type Settings = Record<SettingKey, number>;

export const SETTING_KEYS = Object.keys(DEFAULTS) as SettingKey[];

/** Reads every setting in one query. */
export async function getSettings(): Promise<Settings> {
  const rows = await prisma.platformSetting.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  const out = {} as Settings;
  for (const key of SETTING_KEYS) {
    const raw = byKey.get(key);
    const parsed = raw === undefined ? NaN : Number(raw);
    out[key] = Number.isFinite(parsed) ? parsed : DEFAULTS[key];
  }
  return out;
}

export async function getSetting(key: SettingKey): Promise<number> {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  const parsed = row ? Number(row.value) : NaN;
  return Number.isFinite(parsed) ? parsed : DEFAULTS[key];
}

export { DEFAULTS as SETTING_DEFAULTS };
