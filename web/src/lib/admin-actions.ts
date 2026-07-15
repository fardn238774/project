"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { SETTING_KEYS, type SettingKey } from "@/lib/settings";
import {
  AuctionStatus,
  BroadcastKind,
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
