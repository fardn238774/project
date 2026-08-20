import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { num } from "@/lib/format";
import { FeeType, ListingStatus, LotStatus } from "@/generated/prisma/enums";
import { getJpyToBdt } from "@/lib/fx";

/**
 * Admin platform analytics. Every number here is derived from real rows — the
 * prototype's 4,812 / 9,340 / 2,610 / 41% were design placeholders.
 */
export type PlatformStats = {
  activeListings: number;
  bidsPlaced: number;
  winRatePercent: number;
  successfulImports: number;
  poolingMatchRatePercent: number;
};

export async function getPlatformStats(): Promise<PlatformStats> {
  const [
    usedActive,
    newVariants,
    lotsOpen,
    bidsPlaced,
    lotsWithBids,
    lotsSold,
    shipments,
    bookings,
  ] = await Promise.all([
    prisma.usedCarListing.count({
      where: { status: { in: [ListingStatus.ACTIVE, ListingStatus.OFFER_RECEIVED] } },
    }),
    prisma.newCarVariant.count(),
    prisma.auctionCar.count({ where: { status: { in: [LotStatus.PENDING, LotStatus.LIVE] } } }),
    prisma.bid.count(),
    prisma.auctionCar.count({ where: { bids: { some: {} } } }),
    prisma.auctionCar.count({ where: { status: LotStatus.SOLD } }),
    prisma.shipment.count(),
    prisma.containerBooking.count(),
  ]);

  return {
    activeListings: usedActive + newVariants + lotsOpen,
    bidsPlaced,
    // Of the lots that attracted at least one bid, how many actually sold.
    winRatePercent: lotsWithBids === 0 ? 0 : Math.round((lotsSold / lotsWithBids) * 100),
    successfulImports: lotsSold,
    // Of the shipments that exist, how many joined a shared container.
    poolingMatchRatePercent: shipments === 0 ? 0 : Math.round((bookings / shipments) * 100),
  };
}

export type RevenueRow = { label: string; value: number; basis: string };

/**
 * Revenue by source, per the FR's four named streams. Rates come from
 * admin-editable settings; the volumes come from real rows.
 */
export async function getRevenueBySource(): Promise<{ rows: RevenueRow[]; total: number }> {
  const [settings, fx] = await Promise.all([getSettings(), getJpyToBdt()]);

  const [inquiries, listings, wonLots, builds] = await Promise.all([
    // A referral only earns once the dealer has actually picked it up.
    prisma.dealerInquiry.count({ where: { status: { not: "SUBMITTED" } } }),
    prisma.usedCarListing.count(),
    prisma.auctionCar.findMany({
      where: { status: LotStatus.SOLD, winningBidId: { not: null } },
      include: {
        winningBid: { select: { amountJpy: true } },
        engagements: {
          take: 1,
          include: { organization: { select: { feeType: true, feeValue: true } } },
        },
      },
    }),
    prisma.savedBuild.findMany({ select: { totalBdt: true } }),
  ]);

  // Platform takes a cut of each agent's placement fee on a won lot.
  let agentCommission = 0;
  for (const lot of wonLots) {
    const org = lot.engagements[0]?.organization;
    if (!org || !lot.winningBid) continue;
    const bidBdt = num(lot.winningBid.amountJpy) * fx.rate;
    const fee =
      org.feeType === FeeType.FLAT ? num(org.feeValue) : (bidBdt * num(org.feeValue)) / 100;
    agentCommission += (fee * settings.agentPlacementCutPercent) / 100;
  }

  const modMargin = builds.reduce(
    (sum, b) => sum + (num(b.totalBdt) * settings.modSourcingMarginPercent) / 100,
    0,
  );

  const rows: RevenueRow[] = [
    {
      label: "Dealership referrals",
      value: inquiries * settings.referralFeePerInquiryBdt,
      basis: `${inquiries} picked-up ${inquiries === 1 ? "inquiry" : "inquiries"} × ৳${settings.referralFeePerInquiryBdt.toLocaleString("en-IN")}`,
    },
    {
      label: "Listing fees",
      value: listings * settings.listingFeeBdt,
      basis: `${listings} ${listings === 1 ? "listing" : "listings"} × ৳${settings.listingFeeBdt.toLocaleString("en-IN")}`,
    },
    {
      label: "Agent placement",
      value: agentCommission,
      basis: `${settings.agentPlacementCutPercent}% of agent fees on ${wonLots.length} won ${wonLots.length === 1 ? "lot" : "lots"}`,
    },
    {
      label: "Modification sourcing",
      value: modMargin,
      basis: `${settings.modSourcingMarginPercent}% margin on ${builds.length} saved ${builds.length === 1 ? "build" : "builds"}`,
    },
  ];

  return { rows, total: rows.reduce((s, r) => s + r.value, 0) };
}
