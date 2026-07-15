import { bdt } from "@/lib/format";
import { FeeType } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

/** "3% of bid" / "৳45,000 flat" — the prototype's two fee labels. */
export function feeLabel(feeType: FeeType, feeValue: Prisma.Decimal | number) {
  const v = Number(feeValue.toString());
  return feeType === FeeType.FLAT ? `${bdt(v)} flat` : `${v}% of bid`;
}

/** "★ 4.9" needs one decimal; unrated agents must not render "★ null". */
export function ratingLabel(ratingAvg: Prisma.Decimal | number | null) {
  if (ratingAvg === null) return null;
  return Number(ratingAvg.toString()).toFixed(1);
}
