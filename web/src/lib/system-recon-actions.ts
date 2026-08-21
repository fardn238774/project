"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { saveImage, saveVideo } from "@/lib/uploads";
import {
  OrgStatus,
  FeeType,
  AuctionStatus,
  BroadcastKind,
  Role,
} from "@/generated/prisma/enums";
import type { SystemResult } from "@/lib/system-actions";

/**
 * Admin "System Management" actions for the Reconditioned Import pillar:
 * bidding organizations, auction sessions, and the car lots inside them
 * (with photos + videos). Every action is admin-only and (prev, formData)
 * shaped so it plugs into a form via useActionState.
 */

const MAX_LOT_PHOTOS = 12;
const MAX_LOT_VIDEOS = 6;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const parseNum = (raw: string) => Number(raw.replace(/[^\d.]/g, ""));

function revalidateRecon() {
  revalidatePath("/admin/system/reconditioned");
  revalidatePath("/admin");
  revalidatePath("/auctions", "layout");
}

// ============================================================ ORGANIZATIONS

function readOrgFields(fd: FormData): {
  data?: {
    companyName: string;
    licenseNumber: string;
    yearsInOperation: number;
    about: string | null;
    feeType: FeeType;
    feeValue: number;
    successfulImports: number;
    avgTurnaroundDays: number | null;
  };
  error?: string;
} {
  const companyName = str(fd, "companyName");
  const licenseNumber = str(fd, "licenseNumber");
  if (!companyName) return { error: "Company name is required." };
  if (!licenseNumber) return { error: "License number is required." };

  const yearsInOperation = parseNum(str(fd, "yearsInOperation"));
  const feeValue = parseNum(str(fd, "feeValue"));
  if (!Number.isFinite(yearsInOperation) || yearsInOperation < 0)
    return { error: "Years in operation must be 0 or more." };
  if (!Number.isFinite(feeValue) || feeValue < 0) return { error: "Fee value must be 0 or more." };

  const feeRaw = str(fd, "feeType");
  const feeType = ((Object.values(FeeType) as string[]).includes(feeRaw) ? feeRaw : "PERCENT") as FeeType;

  const importsRaw = str(fd, "successfulImports");
  const turnaroundRaw = str(fd, "avgTurnaroundDays");

  return {
    data: {
      companyName,
      licenseNumber,
      yearsInOperation: Math.round(yearsInOperation),
      about: str(fd, "about") || null,
      feeType,
      feeValue,
      successfulImports: importsRaw ? Math.round(parseNum(importsRaw)) : 0,
      avgTurnaroundDays: turnaroundRaw ? Math.round(parseNum(turnaroundRaw)) : null,
    },
  };
}

export async function createOrg(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();

  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  if (!email || !email.includes("@")) return { error: "Enter a valid login email." };
  if (password.length < 6) return { error: "Set a temporary password of at least 6 characters." };

  const { data, error } = readOrgFields(fd);
  if (error) return { error };

  if (await prisma.user.findUnique({ where: { email } }))
    return { error: "That email is already registered." };
  if (await prisma.organization.findUnique({ where: { licenseNumber: data!.licenseNumber } }))
    return { error: "That license number is already registered." };

  const passwordHash = await bcrypt.hash(password, 10);

  // Admin-created organizations are approved on creation (the admin is vouching).
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, passwordHash, role: Role.ORGANIZATION },
    });
    await tx.organization.create({
      data: { userId: user.id, ...data!, status: OrgStatus.APPROVED, reviewedAt: new Date() },
    });
  });

  revalidateRecon();
  return { ok: true };
}

export async function updateOrg(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const id = str(fd, "id");
  if (!id) return { error: "Missing organization id." };
  const { data, error } = readOrgFields(fd);
  if (error) return { error };

  // License number must stay unique across other orgs.
  const clash = await prisma.organization.findFirst({
    where: { licenseNumber: data!.licenseNumber, id: { not: id } },
    select: { id: true },
  });
  if (clash) return { error: "Another organization already uses that license number." };

  const update: Record<string, unknown> = { ...data! };
  const logo = fd.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const r = await saveImage(logo, "org-logos");
    if (r.error) return { error: r.error };
    update.logoUrl = r.url!;
  }

  await prisma.organization.update({ where: { id }, data: update });
  revalidateRecon();
  return { ok: true };
}

export async function deleteOrg(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const id = str(fd, "id");
  if (!id) return { error: "Missing organization id." };

  const org = await prisma.organization.findUnique({ where: { id }, select: { userId: true } });
  if (!org) return { error: "That organization no longer exists." };

  try {
    // Deleting the login user cascades the organization row.
    await prisma.user.delete({ where: { id: org.userId } });
  } catch {
    return { error: "Couldn't delete this organization — it may have auctions or bids attached." };
  }
  revalidateRecon();
  return { ok: true };
}

export async function setOrgStatus(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const decision = str(fd, "decision"); // APPROVE | REJECT | SUSPEND
  if (!id) return { error: "Missing organization id." };

  const status =
    decision === "APPROVE"
      ? OrgStatus.APPROVED
      : decision === "REJECT"
        ? OrgStatus.REJECTED
        : decision === "SUSPEND"
          ? OrgStatus.SUSPENDED
          : null;
  if (!status) return { error: "Unknown decision." };

  await prisma.organization.update({
    where: { id },
    data: {
      status,
      reviewedAt: new Date(),
      reviewedById: admin.id,
      rejectionReason: decision === "APPROVE" ? null : str(fd, "reason") || null,
    },
  });
  revalidateRecon();
  return { ok: true };
}

// ============================================================ AUCTIONS

function readAuctionFields(fd: FormData): {
  data?: { house: string; location: string; startsAt: Date };
  error?: string;
} {
  const house = str(fd, "house");
  const location = str(fd, "location");
  const startsAtRaw = str(fd, "startsAt");
  if (!house) return { error: "Auction house is required." };
  if (!location) return { error: "Location is required." };
  const startsAt = new Date(startsAtRaw);
  if (!startsAtRaw || Number.isNaN(startsAt.getTime())) return { error: "Pick a valid start date & time." };
  return { data: { house, location, startsAt } };
}

export async function createAuction(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  const admin = await requireAdmin();
  const { data, error } = readAuctionFields(fd);
  if (error) return { error };

  await prisma.auction.create({
    data: { ...data!, status: AuctionStatus.SCHEDULED, createdByAdminId: admin.id },
  });
  revalidateRecon();
  return { ok: true };
}

export async function updateAuction(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const id = str(fd, "id");
  if (!id) return { error: "Missing auction id." };
  const { data, error } = readAuctionFields(fd);
  if (error) return { error };

  const statusRaw = str(fd, "status");
  const status = (Object.values(AuctionStatus) as string[]).includes(statusRaw)
    ? (statusRaw as AuctionStatus)
    : undefined;

  await prisma.auction.update({
    where: { id },
    data: { ...data!, ...(status ? { status } : {}) },
  });
  revalidateRecon();
  return { ok: true };
}

export async function deleteAuction(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const id = str(fd, "id");
  if (!id) return { error: "Missing auction id." };
  try {
    await prisma.auction.delete({ where: { id } });
  } catch {
    return { error: "Couldn't delete this auction — its lots may have bids or payments attached." };
  }
  revalidateRecon();
  return { ok: true };
}

/** Set the auction's live telecast feed (video / YouTube URL). */
export async function setAuctionBroadcast(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  const admin = await requireAdmin();
  const auctionId = str(fd, "auctionId");
  if (!auctionId) return { error: "Missing auction id." };

  const url = str(fd, "url");
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
        return { error: "Stream URL must be http(s)." };
    } catch {
      return { error: "That isn't a valid URL." };
    }
  }

  const kindRaw = str(fd, "kind");
  const kind = (Object.values(BroadcastKind) as string[]).includes(kindRaw)
    ? (kindRaw as BroadcastKind)
    : BroadcastKind.VIDEO;

  await prisma.broadcast.upsert({
    where: { auctionId },
    update: { url: url || null, kind, updatedByAdminId: admin.id },
    create: { auctionId, url: url || null, kind, isLive: false, updatedByAdminId: admin.id },
  });
  revalidateRecon();
  return { ok: true };
}

// ============================================================ AUCTION LOTS (cars)

function readLotFields(fd: FormData): {
  data?: {
    lotNumber: string;
    make: string;
    model: string;
    manufactureYear: number;
    mileageKm: number;
    engineCc: number;
    grade: string;
    chassisCode: string | null;
    startingPriceJpy: number;
    reservePriceJpy: number | null;
    durationSeconds: number;
  };
  error?: string;
} {
  const lotNumber = str(fd, "lotNumber");
  const make = str(fd, "make");
  const model = str(fd, "model");
  const grade = str(fd, "grade");
  if (!lotNumber || !make || !model) return { error: "Lot number, make and model are required." };
  if (!grade) return { error: "Auction grade is required (e.g. 4.5, R, A)." };

  const manufactureYear = parseNum(str(fd, "manufactureYear"));
  const mileageKm = parseNum(str(fd, "mileageKm"));
  const engineCc = parseNum(str(fd, "engineCc"));
  const startingPriceJpy = parseNum(str(fd, "startingPriceJpy"));
  const durationSeconds = parseNum(str(fd, "durationSeconds"));
  const thisYear = new Date().getFullYear();

  if (!Number.isFinite(manufactureYear) || manufactureYear < 1980 || manufactureYear > thisYear)
    return { error: "Enter a valid manufacture year." };
  if (!Number.isFinite(mileageKm) || mileageKm < 0) return { error: "Enter a valid mileage." };
  if (!Number.isFinite(engineCc) || engineCc <= 0) return { error: "Enter a valid engine size (cc)." };
  if (!Number.isFinite(startingPriceJpy) || startingPriceJpy <= 0)
    return { error: "Enter a valid starting price (JPY)." };
  if (!Number.isFinite(durationSeconds) || durationSeconds < 30 || durationSeconds > 86400)
    return { error: "Bidding duration must be 30–86400 seconds." };

  const reserveRaw = str(fd, "reservePriceJpy");
  const reservePriceJpy = reserveRaw ? parseNum(reserveRaw) : null;

  return {
    data: {
      lotNumber,
      make,
      model,
      grade,
      manufactureYear: Math.round(manufactureYear),
      mileageKm: Math.round(mileageKm),
      engineCc: Math.round(engineCc),
      chassisCode: str(fd, "chassisCode") || null,
      startingPriceJpy,
      reservePriceJpy: reservePriceJpy && Number.isFinite(reservePriceJpy) ? reservePriceJpy : null,
      durationSeconds: Math.round(durationSeconds),
    },
  };
}

export async function createLot(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const auctionId = str(fd, "auctionId");
  if (!auctionId) return { error: "Missing auction." };
  const { data, error } = readLotFields(fd);
  if (error) return { error };

  await prisma.auctionCar.create({ data: { auctionId, ...data! } });
  revalidateRecon();
  return { ok: true };
}

export async function updateLot(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const id = str(fd, "id");
  if (!id) return { error: "Missing lot id." };
  const { data, error } = readLotFields(fd);
  if (error) return { error };

  await prisma.auctionCar.update({ where: { id }, data: data! });
  revalidateRecon();
  return { ok: true };
}

export async function deleteLot(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const id = str(fd, "id");
  if (!id) return { error: "Missing lot id." };
  try {
    await prisma.auctionCar.delete({ where: { id } });
  } catch {
    return { error: "Couldn't delete this lot — it may have bids or a payment attached." };
  }
  revalidateRecon();
  return { ok: true };
}

// ------------------------------------------------- lot photos & videos

export async function addLotPhotos(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const lotId = str(fd, "lotId");
  if (!lotId) return { error: "Missing lot id." };

  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one image to upload." };

  const lot = await prisma.auctionCar.findUnique({ where: { id: lotId }, select: { photoUrls: true } });
  if (!lot) return { error: "That lot no longer exists." };
  if (lot.photoUrls.length + files.length > MAX_LOT_PHOTOS)
    return { error: `A lot can have at most ${MAX_LOT_PHOTOS} photos.` };

  const urls: string[] = [];
  for (const file of files) {
    const r = await saveImage(file, "auction-lots");
    if (r.error) return { error: r.error };
    urls.push(r.url!);
  }
  await prisma.auctionCar.update({
    where: { id: lotId },
    data: { photoUrls: { set: [...lot.photoUrls, ...urls] } },
  });
  revalidateRecon();
  return { ok: true };
}

export async function removeLotPhoto(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const lotId = str(fd, "lotId");
  const url = str(fd, "url");
  if (!lotId || !url) return { error: "Missing photo reference." };
  const lot = await prisma.auctionCar.findUnique({ where: { id: lotId }, select: { photoUrls: true } });
  if (!lot) return { error: "That lot no longer exists." };
  await prisma.auctionCar.update({
    where: { id: lotId },
    data: { photoUrls: { set: lot.photoUrls.filter((u) => u !== url) } },
  });
  revalidateRecon();
  return { ok: true };
}

export async function addLotVideos(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const lotId = str(fd, "lotId");
  if (!lotId) return { error: "Missing lot id." };

  const files = fd.getAll("videos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one video to upload." };

  const lot = await prisma.auctionCar.findUnique({ where: { id: lotId }, select: { videoUrls: true } });
  if (!lot) return { error: "That lot no longer exists." };
  if (lot.videoUrls.length + files.length > MAX_LOT_VIDEOS)
    return { error: `A lot can have at most ${MAX_LOT_VIDEOS} videos.` };

  const urls: string[] = [];
  for (const file of files) {
    const r = await saveVideo(file, "auction-lot-videos");
    if (r.error) return { error: r.error };
    urls.push(r.url!);
  }
  await prisma.auctionCar.update({
    where: { id: lotId },
    data: { videoUrls: { set: [...lot.videoUrls, ...urls] } },
  });
  revalidateRecon();
  return { ok: true };
}

export async function removeLotVideo(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const lotId = str(fd, "lotId");
  const url = str(fd, "url");
  if (!lotId || !url) return { error: "Missing video reference." };
  const lot = await prisma.auctionCar.findUnique({ where: { id: lotId }, select: { videoUrls: true } });
  if (!lot) return { error: "That lot no longer exists." };
  await prisma.auctionCar.update({
    where: { id: lotId },
    data: { videoUrls: { set: lot.videoUrls.filter((u) => u !== url) } },
  });
  revalidateRecon();
  return { ok: true };
}
