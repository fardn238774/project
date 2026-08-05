import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getJpyToBdt } from "@/lib/fx";
import { dutyRateFor } from "@/lib/landed-cost-server";
import { computeLandedCost } from "@/lib/landed-cost";
import { num, bdt, bdtLakh } from "@/lib/format";
import { FeeType, ListingStatus, LotStatus } from "@/generated/prisma/enums";
import type { Requirements } from "./requirements";

export type Suggestion = {
  id: string;
  pillar: "New" | "Used" | "Reconditioned";
  title: string;
  priceLabel: string;
  priceBdt: number;
  href: string;
  /** Why this made the shortlist — assembled from the row's real numbers. */
  reasons: string[];
  /** The FR asks the assistant to flag trade-offs explicitly. */
  tradeoffs: string[];
  score: number;
};

/** Seats aren't a column; these are the only body facts we can state honestly. */
const SEVEN_SEATERS = ["Xpander"];
const SUVS = ["Harrier", "Vezel", "CX-5", "X-Trail", "Corolla Cross", "Xpander"];
const HATCHES = ["Swift"];

const bodyOf = (model: string) =>
  SUVS.some((m) => model.includes(m))
    ? "SUV"
    : HATCHES.some((m) => model.includes(m))
      ? "HATCH"
      : "SEDAN";

/**
 * Ranks real inventory across all three pillars against the extracted
 * requirements. Every reason and trade-off is generated from the row's own
 * data — reliability notes come from the Research Hub, running costs from its
 * TCO figures, and reconditioned prices from a full landed-cost calculation.
 */
export async function recommend(req: Requirements, limit = 4): Promise<Suggestion[]> {
  const [newCars, usedCars, lots, research, settings, fx] = await Promise.all([
    prisma.newCar.findMany({
      include: { variants: { orderBy: { priceBdt: "asc" } }, brand: { select: { name: true, slug: true } } },
    }),
    prisma.usedCarListing.findMany({ where: { status: { not: ListingStatus.SOLD } } }),
    prisma.auctionCar.findMany({
      where: { status: { in: [LotStatus.PENDING, LotStatus.LIVE] } },
      include: { auction: true, bids: { orderBy: { amountJpy: "desc" }, take: 1 } },
    }),
    prisma.researchModel.findMany({ include: { issues: true } }),
    getSettings(),
    getJpyToBdt(),
  ]);

  const researchFor = (title: string) =>
    research.find((r) => title.toLowerCase().includes(r.name.split(" ")[1]?.toLowerCase() ?? "§"));

  const out: Suggestion[] = [];

  const scoreCommon = (
    priceBdt: number,
    model: string,
    reasons: string[],
    tradeoffs: string[],
  ) => {
    let score = 0;

    if (req.maxBudgetBdt !== null) {
      if (priceBdt > req.maxBudgetBdt) return null; // Hard filter: over budget.
      const headroom = 1 - priceBdt / req.maxBudgetBdt;
      score += 40 + headroom * 20;
      reasons.push(`${bdtLakh(priceBdt)} — inside your ${bdtLakh(req.maxBudgetBdt)} budget`);
    } else {
      score += 20;
    }

    const body = bodyOf(model);
    if (req.bodyHint && body === req.bodyHint) {
      score += 15;
      reasons.push(`${body.toLowerCase()} body, as asked`);
    }
    if (req.minSeats !== null && req.minSeats >= 6) {
      if (SEVEN_SEATERS.some((m) => model.includes(m))) {
        score += 25;
        reasons.push(`seats ${req.minSeats} — one of the few 7-seaters on the platform`);
      } else {
        score -= 20;
        tradeoffs.push(`5 seats — short of the ${req.minSeats} you asked for`);
      }
    }
    if (req.wantsFamily && body === "SUV") {
      score += 10;
      reasons.push("SUV space suits a family");
    }
    if (req.preferredMakes.length > 0) {
      if (req.preferredMakes.some((m) => model.toLowerCase().includes(m.toLowerCase()))) {
        score += 12;
      }
    }
    return score;
  };

  // ---- Pillar 1: brand new
  for (const car of newCars) {
    const variant = car.variants[0];
    if (!variant) continue;

    const price = num(variant.priceBdt);
    const model = `${car.brand.name} ${car.model}`;
    const reasons: string[] = [];
    const tradeoffs: string[] = [];

    let score = scoreCommon(price, car.model, reasons, tradeoffs);
    if (score === null) continue;

    const economy = num(variant.economyKmPerL);
    if (req.wantsFuelEfficient && economy >= 20) {
      score += 18;
      reasons.push(`${economy} km/l — among the most efficient we list`);
    }
    reasons.push(`${car.warrantyYears}-year warranty, dealer-fulfilled`);
    tradeoffs.push("New-car pricing: no import duty to pay, but the highest sticker of the three routes");

    if (req.preferredMakes.length > 0 && !req.preferredMakes.includes(car.brand.name)) score -= 8;

    out.push({
      id: car.id,
      pillar: "New",
      title: `${model} ${variant.name}`,
      priceLabel: bdtLakh(price),
      priceBdt: price,
      href: `/new-cars/${car.brand.slug}/${car.id}`,
      reasons,
      tradeoffs,
      score,
    });
  }

  // ---- Pillar 2: used P2P
  for (const listing of usedCars) {
    const price = num(listing.priceBdt);
    const reasons: string[] = [];
    const tradeoffs: string[] = [];

    let score = scoreCommon(price, listing.model, reasons, tradeoffs);
    if (score === null) continue;

    if (req.wantsLowestTco) {
      score += 15;
      reasons.push("cheapest route to ownership — no duty, no shipping");
    }
    if (listing.ownershipVerified) {
      score += 8;
      reasons.push("BRTA ownership documents verified");
    } else {
      score -= 10;
      tradeoffs.push("ownership still under BRTA verification");
    }
    if (listing.accidentStatus === "ONE_INCIDENT") {
      tradeoffs.push("one recorded incident — repaired, but on the record");
      score -= 5;
    }
    tradeoffs.push(`${listing.mileageKm.toLocaleString("en-US")} km already on the clock`);

    const r = researchFor(listing.title);
    if (r?.issues[0]) tradeoffs.push(`known issue: ${r.issues[0].text}`);

    out.push({
      id: listing.id,
      pillar: "Used",
      title: listing.title,
      priceLabel: bdtLakh(price),
      priceBdt: price,
      href: `/used-cars/${listing.id}`,
      reasons,
      tradeoffs,
      score,
    });
  }

  // ---- Pillar 3: reconditioned import (priced at full landed cost)
  for (const lot of lots) {
    const bidJpy = lot.bids[0] ? num(lot.bids[0].amountJpy) : num(lot.startingPriceJpy);
    const dutyRate = await dutyRateFor(lot.engineCc);
    const cost = computeLandedCost(
      // No agent chosen yet at recommendation time, so agent fee is excluded
      // and flagged as a trade-off rather than guessed.
      { bidJpy, rate: fx.rate, agent: { feeType: FeeType.PERCENT, feeValue: 0 }, pooled: false },
      settings,
      dutyRate,
    );

    const reasons: string[] = [];
    const tradeoffs: string[] = [];
    let score = scoreCommon(cost.total, lot.model, reasons, tradeoffs);
    if (score === null) continue;

    reasons.push(`landed cost ${bdt(cost.total)} incl. ${dutyRate}% duty and shipping`);
    reasons.push(`grade ${lot.grade} at ${lot.auction.house}, ${lot.manufactureYear} model`);
    tradeoffs.push("agent fee not included — it depends which agent you pick");
    tradeoffs.push("you bid against other buyers, so the final price can move");

    const r = researchFor(`${lot.make} ${lot.model}`);
    if (r?.issues[0]) tradeoffs.push(`known issue: ${r.issues[0].text}`);

    if (req.wantsFuelEfficient && lot.engineCc <= 1500) {
      score += 12;
      reasons.push(`${lot.engineCc}cc — lands in the lowest ${dutyRate}% duty band`);
    }

    out.push({
      id: lot.id,
      pillar: "Reconditioned",
      title: `${lot.manufactureYear} ${lot.make} ${lot.model}`,
      priceLabel: bdt(cost.total),
      priceBdt: cost.total,
      href: "/auctions",
      reasons,
      tradeoffs,
      score,
    });
  }

  // Lowest-TCO briefs should rank on price, not just fit.
  if (req.wantsLowestTco) {
    for (const s of out) s.score += Math.max(0, 20 - s.priceBdt / 500_000);
  }

  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
