"use server";

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentBuyer, requireBuyer } from "@/lib/session";
import { AccidentStatus, ListingStatus, OfferStatus } from "@/generated/prisma/client";
import { bdt } from "@/lib/format";

export type OfferResult = { error?: string; sentAmount?: string };

/** Accepts "৳20,50,000", "2050000", "20,50,000" — all the same offer. */
function parseBdt(raw: string): number {
  const digits = raw.replace(/[^\d.]/g, "");
  const n = Number(digits);
  return Number.isFinite(n) ? n : NaN;
}

export async function submitOffer(
  _prev: OfferResult,
  formData: FormData,
): Promise<OfferResult> {
  const buyer = await currentBuyer();
  if (!buyer) return { error: "Only buyer accounts can make offers." };

  const listingId = String(formData.get("listingId") ?? "");
  const amount = parseBdt(String(formData.get("amount") ?? ""));

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter an offer amount, e.g. ৳20,50,000." };
  }

  const listing = await prisma.usedCarListing.findUnique({ where: { id: listingId } });
  if (!listing) return { error: "That listing is no longer available." };
  if (listing.sellerId === buyer.id) return { error: "You can't make an offer on your own listing." };
  if (listing.status === ListingStatus.SOLD) return { error: "That car has already sold." };

  const duplicate = await prisma.offer.findFirst({
    where: { listingId, buyerId: buyer.id, status: OfferStatus.PENDING },
  });
  if (duplicate) return { error: "You already have a pending offer on this listing." };

  // The seller's dashboard reads status, so flag the listing as having offers.
  await prisma.$transaction([
    prisma.offer.create({ data: { listingId, buyerId: buyer.id, amountBdt: amount } }),
    prisma.usedCarListing.update({
      where: { id: listingId },
      data: { status: ListingStatus.OFFER_RECEIVED },
    }),
  ]);

  revalidatePath(`/used-cars/${listingId}`);
  revalidatePath("/used-cars/seller");
  return { sentAmount: bdt(amount) };
}

// --------------------------------------------------- seller: create a listing

export type CreateListingResult = { error?: string };

/** Accepted upload types → file extension. */
const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
/** Auction sheets are accepted as an image or a PDF; everything else is refused. */
const SHEET_EXT: Record<string, string> = { ...IMAGE_EXT, "application/pdf": "pdf" };
const VIDEO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
};
const MAX_SHEET_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_PHOTO_BYTES = 6 * 1024 * 1024; // 6 MB each
const MAX_PHOTOS = 8;
const MAX_VIDEO_BYTES = 40 * 1024 * 1024; // 40 MB
const ACCIDENT_VALUES = new Set<string>(Object.values(AccidentStatus));

/** Write one uploaded file under public/uploads/<subdir>, return its public path. */
async function saveUpload(file: File, subdir: string, ext: string): Promise<string> {
  const fileName = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${subdir}/${fileName}`;
}

/**
 * A signed-in buyer submits their own car for sale. The listing is created in
 * PENDING_VERIFICATION and stays off the public marketplace until an admin
 * approves it (see reviewListing in admin-actions). The auction sheet is saved
 * under public/uploads so the admin — and later buyers — can open it.
 *
 * Note: files are written to the local filesystem, which is fine for local dev
 * and self-hosting. A serverless deploy (e.g. Vercel) would need object storage
 * instead; only this upload block would change.
 */
export async function createListing(
  _prev: CreateListingResult,
  formData: FormData,
): Promise<CreateListingResult> {
  const seller = await requireBuyer();

  const str = (key: string) => String(formData.get(key) ?? "").trim();
  const title = str("title");
  const make = str("make");
  const model = str("model");
  const manufactureYear = Number(str("manufactureYear"));
  const mileageKm = Number(str("mileageKm"));
  const location = str("location");
  const priceBdt = parseBdt(str("priceBdt"));
  const registrationNumber = str("registrationNumber");
  const registrationYearRaw = str("registrationYear");
  const registrationYear = registrationYearRaw ? Number(registrationYearRaw) : null;
  const transmission = str("transmission") || null;
  const fuelType = str("fuelType") || null;
  const engineCcRaw = str("engineCc");
  const engineCc = engineCcRaw ? Number(engineCcRaw) : null;
  const color = str("color") || null;
  const conditionNotes = str("conditionNotes");
  const accidentRaw = str("accidentStatus");

  const thisYear = new Date().getFullYear();

  if (title.length < 4) return { error: "Give the listing a clear title, e.g. “2019 Toyota Axio Hybrid”." };
  if (!make) return { error: "Enter the car's make (e.g. Toyota)." };
  if (!model) return { error: "Enter the car's model (e.g. Axio)." };
  if (!Number.isInteger(manufactureYear) || manufactureYear < 1980 || manufactureYear > thisYear)
    return { error: `Enter a valid manufacture year (1980–${thisYear}).` };
  if (!Number.isFinite(mileageKm) || mileageKm < 0 || mileageKm > 2_000_000)
    return { error: "Enter the mileage in kilometres." };
  if (!location) return { error: "Enter the car's location (city)." };
  if (!Number.isFinite(priceBdt) || priceBdt <= 0)
    return { error: "Enter an asking price, e.g. ৳20,50,000." };
  if (!registrationNumber) return { error: "Enter the BRTA registration number." };
  if (registrationYear !== null &&
      (!Number.isInteger(registrationYear) || registrationYear < 1980 || registrationYear > thisYear))
    return { error: `Registration year must be between 1980 and ${thisYear}.` };
  if (engineCc !== null && (!Number.isFinite(engineCc) || engineCc <= 0 || engineCc > 10000))
    return { error: "That engine size (cc) doesn't look right." };
  if (conditionNotes.length < 20)
    return { error: "Describe the car's condition in a little more detail (at least 20 characters)." };

  const accidentStatus = ACCIDENT_VALUES.has(accidentRaw)
    ? (accidentRaw as AccidentStatus)
    : AccidentStatus.NOT_CHECKED;

  // ---- auction sheet (required) ----
  const sheet = formData.get("auctionSheet");
  if (!(sheet instanceof File) || sheet.size === 0)
    return { error: "Attach the car's auction sheet (JPG, PNG, WebP or PDF)." };
  const sheetExt = SHEET_EXT[sheet.type];
  if (!sheetExt) return { error: "The auction sheet must be a JPG, PNG, WebP or PDF file." };
  if (sheet.size > MAX_SHEET_BYTES) return { error: "The auction sheet must be 5 MB or smaller." };

  // ---- photos (optional, multiple) ----
  const photoFiles = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (photoFiles.length > MAX_PHOTOS)
    return { error: `You can upload up to ${MAX_PHOTOS} photos.` };
  for (const p of photoFiles) {
    if (!IMAGE_EXT[p.type]) return { error: "Photos must be JPG, PNG or WebP images." };
    if (p.size > MAX_PHOTO_BYTES) return { error: "Each photo must be 6 MB or smaller." };
  }

  // ---- 360°/walkaround video (optional) ----
  const videoRaw = formData.get("video360");
  const videoFile = videoRaw instanceof File && videoRaw.size > 0 ? videoRaw : null;
  let videoExt = "";
  if (videoFile) {
    videoExt = VIDEO_EXT[videoFile.type];
    if (!videoExt) return { error: "The video must be an MP4, WebM, MOV or MKV file." };
    if (videoFile.size > MAX_VIDEO_BYTES) return { error: "The video must be 40 MB or smaller." };
  }

  // Everything validated — write the files, then create the row.
  let auctionSheetUrl: string;
  let photoUrls: string[];
  let videoUrl: string | null = null;
  try {
    auctionSheetUrl = await saveUpload(sheet, "auction-sheets", sheetExt);
    photoUrls = await Promise.all(
      photoFiles.map((p) => saveUpload(p, "listing-photos", IMAGE_EXT[p.type])),
    );
    if (videoFile) videoUrl = await saveUpload(videoFile, "listing-videos", videoExt);
  } catch {
    return { error: "Couldn't save one of your uploads — please try again." };
  }

  await prisma.usedCarListing.create({
    data: {
      sellerId: seller.id,
      title,
      make,
      model,
      manufactureYear,
      mileageKm,
      location,
      priceBdt,
      conditionNotes,
      accidentStatus,
      registrationNumber,
      registrationYear,
      transmission,
      fuelType,
      engineCc,
      color,
      auctionSheetUrl,
      photoUrls,
      videoUrl,
      status: ListingStatus.PENDING_VERIFICATION,
    },
  });

  revalidatePath("/used-cars/seller");
  revalidatePath("/admin");
  redirect("/used-cars/seller?created=1");
}

// ----------------------------------------- seller: offers & marking sold

export type SellerActionResult = { error?: string; ok?: boolean };

/** Seller accepts an offer: it wins, others are declined, the car is marked sold. */
export async function acceptOffer(offerId: string): Promise<SellerActionResult> {
  const me = await requireBuyer();
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { listing: { select: { id: true, sellerId: true, status: true } } },
  });
  if (!offer) return { error: "That offer no longer exists." };
  if (offer.listing.sellerId !== me.id) return { error: "Only the seller can accept offers." };
  if (offer.listing.status === ListingStatus.SOLD) return { error: "This car is already sold." };

  await prisma.$transaction([
    prisma.offer.update({ where: { id: offerId }, data: { status: OfferStatus.ACCEPTED } }),
    prisma.offer.updateMany({
      where: { listingId: offer.listing.id, id: { not: offerId }, status: OfferStatus.PENDING },
      data: { status: OfferStatus.REJECTED },
    }),
    prisma.usedCarListing.update({
      where: { id: offer.listing.id },
      data: { status: ListingStatus.SOLD },
    }),
  ]);

  revalidatePath(`/used-cars/${offer.listing.id}`);
  revalidatePath("/used-cars/seller");
  revalidatePath("/used-cars");
  return { ok: true };
}

/** Seller declines a single offer. Reverts the listing to ACTIVE if none remain. */
export async function rejectOffer(offerId: string): Promise<SellerActionResult> {
  const me = await requireBuyer();
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { listing: { select: { id: true, sellerId: true } } },
  });
  if (!offer) return { error: "That offer no longer exists." };
  if (offer.listing.sellerId !== me.id) return { error: "Only the seller can decline offers." };

  await prisma.offer.update({ where: { id: offerId }, data: { status: OfferStatus.REJECTED } });
  const stillPending = await prisma.offer.count({
    where: { listingId: offer.listing.id, status: OfferStatus.PENDING },
  });
  if (stillPending === 0) {
    await prisma.usedCarListing.updateMany({
      where: { id: offer.listing.id, status: ListingStatus.OFFER_RECEIVED },
      data: { status: ListingStatus.ACTIVE },
    });
  }

  revalidatePath(`/used-cars/${offer.listing.id}`);
  revalidatePath("/used-cars/seller");
  return { ok: true };
}

/** Seller marks the car sold once a deal is agreed (e.g. off a chat). */
export async function markSold(listingId: string): Promise<SellerActionResult> {
  const me = await requireBuyer();
  const listing = await prisma.usedCarListing.findUnique({
    where: { id: listingId },
    select: { sellerId: true },
  });
  if (!listing) return { error: "That listing no longer exists." };
  if (listing.sellerId !== me.id) return { error: "Only the seller can mark it sold." };

  await prisma.usedCarListing.update({
    where: { id: listingId },
    data: { status: ListingStatus.SOLD },
  });

  revalidatePath(`/used-cars/${listingId}`);
  revalidatePath("/used-cars/seller");
  revalidatePath("/used-cars");
  return { ok: true };
}
