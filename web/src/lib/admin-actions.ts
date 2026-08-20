"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { SETTING_KEYS, type SettingKey } from "@/lib/settings";
import {
  AuctionStatus,
  BroadcastKind,
  ListingStatus,
  LotStatus,
  OrgStatus,
} from "@/generated/prisma/enums";

export type AdminResult = { error?: string; ok?: boolean };

// ------------------------------------------------------- organization review

export async function reviewOrganization(
  organizationId: string,
  decision: "APPROVE" | "REJECT" | "SUSPEND",
  rejectionReason?: string,
): Promise<AdminResult> {
  const admin = await requireAdmin();

  const status =
    decision === "APPROVE"
      ? OrgStatus.APPROVED
      : decision === "REJECT"
        ? OrgStatus.REJECTED
        : OrgStatus.SUSPENDED;

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      status,
      reviewedAt: new Date(),
      reviewedById: admin.id,
      rejectionReason: decision === "APPROVE" ? null : (rejectionReason?.trim() || null),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/auctions");
  return { ok: true };
}

// --------------------------------------------------- used-car listing review

/**
 * A seller-submitted used-car listing arrives as PENDING_VERIFICATION and stays
 * off the marketplace until reviewed here. Approving it flips the listing to
 * ACTIVE (and marks ownership verified, since the admin has just checked the
 * registration details and auction sheet); rejecting records a reason the
 * seller sees on their dashboard.
 */
export async function reviewListing(
  listingId: string,
  decision: "APPROVE" | "REJECT",
  rejectionReason?: string,
): Promise<AdminResult> {
  await requireAdmin();

  const listing = await prisma.usedCarListing.findUnique({
    where: { id: listingId },
    select: { id: true, status: true },
  });
  if (!listing) return { error: "That listing no longer exists." };
  if (listing.status !== ListingStatus.PENDING_VERIFICATION)
    return { error: "That listing has already been reviewed." };

  if (decision === "APPROVE") {
    await prisma.usedCarListing.update({
      where: { id: listingId },
      data: {
        status: ListingStatus.ACTIVE,
        ownershipVerified: true,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });
  } else {
    const reason = rejectionReason?.trim();
    if (!reason) return { error: "Add a short reason so the seller knows what to fix." };
    await prisma.usedCarListing.update({
      where: { id: listingId },
      data: {
        status: ListingStatus.REJECTED,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });
  }

  revalidatePath("/admin");
  revalidatePath("/used-cars");
  revalidatePath("/used-cars/seller");
  revalidatePath(`/used-cars/${listingId}`);
  return { ok: true };
}

// ------------------------------------------------------------ auction control

/**
 * Admin controls WHEN a lot goes on the block — never its price. There is no
 * code path anywhere that lets an admin or organization move a bid.
 */
export async function startLot(auctionCarId: string, durationSeconds: number): Promise<AdminResult> {
  await requireAdmin();

  if (!Number.isFinite(durationSeconds) || durationSeconds < 30 || durationSeconds > 86400) {
    return { error: "Duration must be between 30 seconds and 24 hours." };
  }

  const lot = await prisma.auctionCar.findUnique({
    where: { id: auctionCarId },
    include: { auction: { select: { id: true, status: true } } },
  });
  if (!lot) return { error: "That lot no longer exists." };
  if (lot.status === LotStatus.SOLD) return { error: "That lot has already sold." };

  const now = new Date();

  await prisma.$transaction([
    // Only one lot is on the block at a time, as at a real auction house.
    prisma.auctionCar.updateMany({
      where: { auctionId: lot.auctionId, status: LotStatus.LIVE, id: { not: auctionCarId } },
      data: { status: LotStatus.PENDING, startedAt: null, endsAt: null },
    }),
    prisma.auctionCar.update({
      where: { id: auctionCarId },
      data: {
        status: LotStatus.LIVE,
        startedAt: now,
        endsAt: new Date(now.getTime() + durationSeconds * 1000),
        durationSeconds,
        // A restarted lot begins its anti-snipe history afresh.
        extensionCount: 0,
        winningBidId: null,
      },
    }),
    prisma.auction.update({
      where: { id: lot.auctionId },
      data: { status: AuctionStatus.LIVE },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/auctions", "layout");
  return { ok: true };
}

export async function endAuction(auctionId: string): Promise<AdminResult> {
  await requireAdmin();

  await prisma.$transaction([
    prisma.auctionCar.updateMany({
      where: { auctionId, status: LotStatus.LIVE },
      data: { status: LotStatus.NO_SALE, endsAt: new Date() },
    }),
    prisma.auction.update({ where: { id: auctionId }, data: { status: AuctionStatus.ENDED } }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/auctions", "layout");
  return { ok: true };
}

/**
 * One-click "start the auction now" for the admin. Flips the session LIVE and
 * puts a lot on the block — the lot already live if there is one, otherwise the
 * first lot that hasn't sold. Works from any status, so a SCHEDULED session can
 * be started early and an ENDED one can be re-run for a demo. Price still only
 * ever moves through real buyer bids; this only opens the block.
 */
export async function startAuction(auctionId: string): Promise<AdminResult> {
  await requireAdmin();

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { lots: { orderBy: { lotNumber: "asc" } } },
  });
  if (!auction) return { error: "That auction no longer exists." };

  const target =
    auction.lots.find((l) => l.status === LotStatus.LIVE) ??
    auction.lots.find((l) => l.status !== LotStatus.SOLD);
  if (!target) return { error: "Every lot in this session has already sold." };

  const now = new Date();
  const durationSeconds = target.durationSeconds || 120;

  await prisma.$transaction([
    // At a real auction house only one lot is on the block at a time.
    prisma.auctionCar.updateMany({
      where: { auctionId, status: LotStatus.LIVE, id: { not: target.id } },
      data: { status: LotStatus.PENDING, startedAt: null, endsAt: null },
    }),
    prisma.auctionCar.update({
      where: { id: target.id },
      data: {
        status: LotStatus.LIVE,
        startedAt: now,
        endsAt: new Date(now.getTime() + durationSeconds * 1000),
        durationSeconds,
        extensionCount: 0,
        winningBidId: null,
      },
    }),
    prisma.auction.update({ where: { id: auctionId }, data: { status: AuctionStatus.LIVE } }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/auctions", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------- broadcast

export async function setBroadcast(
  auctionId: string,
  url: string,
  kind: BroadcastKind,
  isLive: boolean,
): Promise<AdminResult> {
  const admin = await requireAdmin();

  const trimmed = url.trim();
  if (isLive && !trimmed) return { error: "Add a stream URL before going live." };

  if (trimmed) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return { error: "Stream URL must be http(s)." };
      }
    } catch {
      return { error: "That isn't a valid URL." };
    }
  }

  await prisma.broadcast.upsert({
    where: { auctionId },
    update: { url: trimmed || null, kind, isLive, updatedByAdminId: admin.id },
    create: { auctionId, url: trimmed || null, kind, isLive, updatedByAdminId: admin.id },
  });

  revalidatePath("/admin");
  revalidatePath("/auctions", "layout");
  return { ok: true };
}

// ----------------------------------------------------------------- settings

export async function updateSettings(formData: FormData): Promise<AdminResult> {
  await requireAdmin();

  const updates: { key: SettingKey; value: string }[] = [];
  for (const key of SETTING_KEYS) {
    const raw = formData.get(key);
    if (raw === null) continue;
    const value = Number(String(raw));
    if (!Number.isFinite(value) || value < 0) {
      return { error: `${key} must be a non-negative number.` };
    }
    updates.push({ key, value: String(value) });
  }

  await prisma.$transaction(
    updates.map((u) =>
      prisma.platformSetting.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value },
      }),
    ),
  );

  revalidatePath("/admin");
  revalidatePath("/auctions", "layout");
  return { ok: true };
}

export async function updateDutyBand(id: string, ratePercent: number): Promise<AdminResult> {
  await requireAdmin();

  if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 1000) {
    return { error: "Duty rate must be between 0 and 1000%." };
  }

  await prisma.dutyRate.update({ where: { id }, data: { ratePercent } });
  revalidatePath("/admin");
  revalidatePath("/auctions", "layout");
  return { ok: true };
}
