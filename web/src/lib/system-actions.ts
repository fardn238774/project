"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { AccidentStatus, ListingStatus } from "@/generated/prisma/enums";
import { saveImage, saveVideo } from "@/lib/uploads";

/**
 * Admin "System Management" actions for the New Cars catalog: create / edit /
 * delete brands, car models, their photos, and variants. Every action is admin-
 * only and shaped as (prevState, formData) so it plugs straight into a form via
 * useActionState. Prices accept "12,50,000" or "1250000" alike.
 */
export type SystemResult = { error?: string; ok?: boolean };

const MAX_CAR_PHOTOS = 12;
const MAX_CAR_VIDEOS = 6;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const parseNum = (raw: string) => Number(raw.replace(/[^\d.]/g, ""));

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Brand slugs are unique — derive from the name, then de-duplicate. */
async function uniqueBrandSlug(name: string, ignoreId?: string): Promise<string> {
  const base = slugify(name) || "brand";
  let slug = base;
  let n = 2;
  // Loop until no other brand holds this slug.
  while (true) {
    const clash = await prisma.brand.findFirst({
      where: { slug, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
      select: { id: true },
    });
    if (!clash) return slug;
    slug = `${base}-${n++}`;
  }
}

// saveImage / saveVideo now live in @/lib/uploads (shared with the reconditioned module).

function revalidateCatalog() {
  revalidatePath("/admin/system/new-cars");
  revalidatePath("/new-cars", "layout");
}

// ============================================================ BRANDS

export async function createBrand(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();

  const name = str(fd, "name");
  if (!name) return { error: "Brand name is required." };
  const country = str(fd, "country") || null;

  let logoUrl: string | null = null;
  const logo = fd.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const r = await saveImage(logo, "brand-logos");
    if (r.error) return { error: r.error };
    logoUrl = r.url!;
  }

  await prisma.brand.create({
    data: { name, slug: await uniqueBrandSlug(name), country, logoUrl },
  });
  revalidateCatalog();
  return { ok: true };
}

export async function updateBrand(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();

  const id = str(fd, "id");
  const name = str(fd, "name");
  if (!id) return { error: "Missing brand id." };
  if (!name) return { error: "Brand name is required." };
  const country = str(fd, "country") || null;

  const data: { name: string; slug: string; country: string | null; logoUrl?: string } = {
    name,
    slug: await uniqueBrandSlug(name, id),
    country,
  };

  const logo = fd.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const r = await saveImage(logo, "brand-logos");
    if (r.error) return { error: r.error };
    data.logoUrl = r.url!;
  }

  await prisma.brand.update({ where: { id }, data });
  revalidateCatalog();
  return { ok: true };
}

export async function deleteBrand(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const id = str(fd, "id");
  if (!id) return { error: "Missing brand id." };
  try {
    await prisma.brand.delete({ where: { id } });
  } catch {
    return { error: "Couldn't delete this brand — it may have related records." };
  }
  revalidateCatalog();
  return { ok: true };
}

// ============================================================ CAR MODELS

/** Read + validate the shared car fields from the form. */
function readCarFields(fd: FormData): { data?: {
  model: string; priceMinBdt: number; priceMaxBdt: number; warrantyYears: number; warrantyKm: number;
}; error?: string } {
  const model = str(fd, "model");
  if (!model) return { error: "Model name is required." };
  const priceMinBdt = parseNum(str(fd, "priceMinBdt"));
  const priceMaxBdt = parseNum(str(fd, "priceMaxBdt"));
  const warrantyYears = parseNum(str(fd, "warrantyYears"));
  const warrantyKm = parseNum(str(fd, "warrantyKm"));

  if (!Number.isFinite(priceMinBdt) || !Number.isFinite(priceMaxBdt) || priceMinBdt <= 0 || priceMaxBdt <= 0)
    return { error: "Enter valid min and max prices." };
  if (priceMinBdt > priceMaxBdt) return { error: "Min price can't be higher than max price." };
  if (!Number.isFinite(warrantyYears) || warrantyYears < 0) return { error: "Warranty years must be 0 or more." };
  if (!Number.isFinite(warrantyKm) || warrantyKm < 0) return { error: "Warranty km must be 0 or more." };

  return { data: { model, priceMinBdt, priceMaxBdt, warrantyYears: Math.round(warrantyYears), warrantyKm: Math.round(warrantyKm) } };
}

export async function createCar(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const brandId = str(fd, "brandId");
  if (!brandId) return { error: "Missing brand." };
  const { data, error } = readCarFields(fd);
  if (error) return { error };

  await prisma.newCar.create({ data: { brandId, ...data! } });
  revalidateCatalog();
  return { ok: true };
}

export async function updateCar(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const id = str(fd, "id");
  if (!id) return { error: "Missing car id." };
  const { data, error } = readCarFields(fd);
  if (error) return { error };

  await prisma.newCar.update({ where: { id }, data: data! });
  revalidateCatalog();
  return { ok: true };
}

export async function deleteCar(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const id = str(fd, "id");
  if (!id) return { error: "Missing car id." };
  try {
    await prisma.newCar.delete({ where: { id } });
  } catch {
    return { error: "Couldn't delete this car — it may have inquiries or test drives attached." };
  }
  revalidateCatalog();
  return { ok: true };
}

// ---------------------------------------------------------- car photos

export async function addCarPhotos(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const carId = str(fd, "carId");
  if (!carId) return { error: "Missing car id." };

  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one image to upload." };

  const car = await prisma.newCar.findUnique({ where: { id: carId }, select: { photoUrls: true } });
  if (!car) return { error: "That car no longer exists." };
  if (car.photoUrls.length + files.length > MAX_CAR_PHOTOS)
    return { error: `A car can have at most ${MAX_CAR_PHOTOS} photos.` };

  const urls: string[] = [];
  for (const file of files) {
    const r = await saveImage(file, "new-cars");
    if (r.error) return { error: r.error };
    urls.push(r.url!);
  }

  await prisma.newCar.update({
    where: { id: carId },
    data: { photoUrls: { set: [...car.photoUrls, ...urls] } },
  });
  revalidateCatalog();
  return { ok: true };
}

export async function removeCarPhoto(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const carId = str(fd, "carId");
  const url = str(fd, "url");
  if (!carId || !url) return { error: "Missing photo reference." };

  const car = await prisma.newCar.findUnique({ where: { id: carId }, select: { photoUrls: true } });
  if (!car) return { error: "That car no longer exists." };

  await prisma.newCar.update({
    where: { id: carId },
    data: { photoUrls: { set: car.photoUrls.filter((u) => u !== url) } },
  });
  revalidateCatalog();
  return { ok: true };
}

// ---------------------------------------------------------- car videos

export async function addCarVideos(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const carId = str(fd, "carId");
  if (!carId) return { error: "Missing car id." };

  const files = fd.getAll("videos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one video to upload." };

  const car = await prisma.newCar.findUnique({ where: { id: carId }, select: { videoUrls: true } });
  if (!car) return { error: "That car no longer exists." };
  if (car.videoUrls.length + files.length > MAX_CAR_VIDEOS)
    return { error: `A car can have at most ${MAX_CAR_VIDEOS} videos.` };

  const urls: string[] = [];
  for (const file of files) {
    const r = await saveVideo(file, "new-car-videos");
    if (r.error) return { error: r.error };
    urls.push(r.url!);
  }

  await prisma.newCar.update({
    where: { id: carId },
    data: { videoUrls: { set: [...car.videoUrls, ...urls] } },
  });
  revalidateCatalog();
  return { ok: true };
}

export async function removeCarVideo(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const carId = str(fd, "carId");
  const url = str(fd, "url");
  if (!carId || !url) return { error: "Missing video reference." };

  const car = await prisma.newCar.findUnique({ where: { id: carId }, select: { videoUrls: true } });
  if (!car) return { error: "That car no longer exists." };

  await prisma.newCar.update({
    where: { id: carId },
    data: { videoUrls: { set: car.videoUrls.filter((u) => u !== url) } },
  });
  revalidateCatalog();
  return { ok: true };
}

// ============================================================ VARIANTS

function readVariantFields(fd: FormData): { data?: {
  name: string; priceBdt: number; engine: string; transmission: string; economyKmPerL: number;
}; error?: string } {
  const name = str(fd, "name");
  const engine = str(fd, "engine");
  const transmission = str(fd, "transmission");
  const priceBdt = parseNum(str(fd, "priceBdt"));
  const economyKmPerL = parseNum(str(fd, "economyKmPerL"));

  if (!name) return { error: "Variant name is required." };
  if (!engine) return { error: "Engine is required." };
  if (!transmission) return { error: "Transmission is required." };
  if (!Number.isFinite(priceBdt) || priceBdt <= 0) return { error: "Enter a valid variant price." };
  if (!Number.isFinite(economyKmPerL) || economyKmPerL <= 0) return { error: "Enter a valid fuel economy (km/l)." };

  return { data: { name, priceBdt, engine, transmission, economyKmPerL } };
}

export async function createVariant(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const newCarId = str(fd, "carId");
  if (!newCarId) return { error: "Missing car." };
  const { data, error } = readVariantFields(fd);
  if (error) return { error };

  await prisma.newCarVariant.create({ data: { newCarId, ...data! } });
  revalidateCatalog();
  return { ok: true };
}

export async function updateVariant(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const id = str(fd, "id");
  if (!id) return { error: "Missing variant id." };
  const { data, error } = readVariantFields(fd);
  if (error) return { error };

  await prisma.newCarVariant.update({ where: { id }, data: data! });
  revalidateCatalog();
  return { ok: true };
}

export async function deleteVariant(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const id = str(fd, "id");
  if (!id) return { error: "Missing variant id." };
  try {
    await prisma.newCarVariant.delete({ where: { id } });
  } catch {
    return { error: "Couldn't delete this variant — it may have inquiries or payments attached." };
  }
  revalidateCatalog();
  return { ok: true };
}

// ============================================================ USED CARS

const ACCIDENT_VALUES = Object.values(AccidentStatus) as string[];

function revalidateUsedCars() {
  revalidatePath("/admin/system/used-cars");
  revalidatePath("/admin"); // the main admin panel also lists pending listings
  revalidatePath("/used-cars", "layout");
}

/** Read + validate the editable used-car listing fields from the form. */
function readUsedCarFields(fd: FormData): {
  data?: {
    title: string;
    make: string;
    model: string;
    manufactureYear: number;
    mileageKm: number;
    location: string;
    priceBdt: number;
    conditionNotes: string;
    accidentStatus: AccidentStatus;
    transmission: string | null;
    fuelType: string | null;
    engineCc: number | null;
    color: string | null;
    registrationNumber: string | null;
    registrationYear: number | null;
  };
  error?: string;
} {
  const title = str(fd, "title");
  const make = str(fd, "make");
  const model = str(fd, "model");
  const location = str(fd, "location");
  const conditionNotes = str(fd, "conditionNotes");
  if (!title || !make || !model) return { error: "Title, make and model are required." };
  if (!location) return { error: "Location is required." };
  if (!conditionNotes) return { error: "Condition notes are required." };

  const manufactureYear = parseNum(str(fd, "manufactureYear"));
  const mileageKm = parseNum(str(fd, "mileageKm"));
  const priceBdt = parseNum(str(fd, "priceBdt"));
  const thisYear = new Date().getFullYear();
  if (!Number.isFinite(manufactureYear) || manufactureYear < 1980 || manufactureYear > thisYear)
    return { error: "Enter a valid manufacture year." };
  if (!Number.isFinite(mileageKm) || mileageKm < 0) return { error: "Enter a valid mileage." };
  if (!Number.isFinite(priceBdt) || priceBdt <= 0) return { error: "Enter a valid price." };

  const accidentRaw = str(fd, "accidentStatus");
  const accidentStatus = (
    ACCIDENT_VALUES.includes(accidentRaw) ? accidentRaw : "NOT_CHECKED"
  ) as AccidentStatus;

  const engineCcRaw = str(fd, "engineCc");
  const regYearRaw = str(fd, "registrationYear");

  return {
    data: {
      title,
      make,
      model,
      location,
      conditionNotes,
      manufactureYear: Math.round(manufactureYear),
      mileageKm: Math.round(mileageKm),
      priceBdt,
      accidentStatus,
      transmission: str(fd, "transmission") || null,
      fuelType: str(fd, "fuelType") || null,
      engineCc: engineCcRaw ? Math.round(parseNum(engineCcRaw)) : null,
      color: str(fd, "color") || null,
      registrationNumber: str(fd, "registrationNumber") || null,
      registrationYear: regYearRaw ? Math.round(parseNum(regYearRaw)) : null,
    },
  };
}

export async function createUsedCar(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const sellerId = str(fd, "sellerId");
  if (!sellerId) return { error: "Choose a seller for this listing." };
  const seller = await prisma.buyer.findUnique({ where: { id: sellerId }, select: { id: true } });
  if (!seller) return { error: "That seller no longer exists." };

  const { data, error } = readUsedCarFields(fd);
  if (error) return { error };

  // Admin-created listings are published straight away (the admin is vouching).
  await prisma.usedCarListing.create({
    data: {
      sellerId,
      ...data!,
      status: ListingStatus.ACTIVE,
      ownershipVerified: true,
      reviewedAt: new Date(),
    },
  });
  revalidateUsedCars();
  return { ok: true };
}

export async function updateUsedCar(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const id = str(fd, "id");
  if (!id) return { error: "Missing listing id." };
  const { data, error } = readUsedCarFields(fd);
  if (error) return { error };

  await prisma.usedCarListing.update({ where: { id }, data: data! });
  revalidateUsedCars();
  revalidatePath(`/used-cars/${id}`);
  return { ok: true };
}

export async function deleteUsedCar(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const id = str(fd, "id");
  if (!id) return { error: "Missing listing id." };
  try {
    await prisma.usedCarListing.delete({ where: { id } });
  } catch {
    return { error: "Couldn't delete this listing — it may have payments attached." };
  }
  revalidateUsedCars();
  return { ok: true };
}

// ------------------------------------------------- used-car photos & video

export async function addUsedCarPhotos(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const listingId = str(fd, "listingId");
  if (!listingId) return { error: "Missing listing id." };

  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one image to upload." };

  const listing = await prisma.usedCarListing.findUnique({
    where: { id: listingId },
    select: { photoUrls: true },
  });
  if (!listing) return { error: "That listing no longer exists." };
  if (listing.photoUrls.length + files.length > MAX_CAR_PHOTOS)
    return { error: `A listing can have at most ${MAX_CAR_PHOTOS} photos.` };

  const urls: string[] = [];
  for (const file of files) {
    const r = await saveImage(file, "listing-photos");
    if (r.error) return { error: r.error };
    urls.push(r.url!);
  }

  await prisma.usedCarListing.update({
    where: { id: listingId },
    data: { photoUrls: { set: [...listing.photoUrls, ...urls] } },
  });
  revalidateUsedCars();
  revalidatePath(`/used-cars/${listingId}`);
  return { ok: true };
}

export async function removeUsedCarPhoto(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const listingId = str(fd, "listingId");
  const url = str(fd, "url");
  if (!listingId || !url) return { error: "Missing photo reference." };

  const listing = await prisma.usedCarListing.findUnique({
    where: { id: listingId },
    select: { photoUrls: true },
  });
  if (!listing) return { error: "That listing no longer exists." };

  await prisma.usedCarListing.update({
    where: { id: listingId },
    data: { photoUrls: { set: listing.photoUrls.filter((u) => u !== url) } },
  });
  revalidateUsedCars();
  revalidatePath(`/used-cars/${listingId}`);
  return { ok: true };
}

/** Used-car listings carry a single walkaround video (as the seller form does). */
export async function setUsedCarVideo(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const listingId = str(fd, "listingId");
  if (!listingId) return { error: "Missing listing id." };

  const file = fd.get("video");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a video to upload." };
  const r = await saveVideo(file, "listing-videos");
  if (r.error) return { error: r.error };

  await prisma.usedCarListing.update({ where: { id: listingId }, data: { videoUrl: r.url! } });
  revalidateUsedCars();
  revalidatePath(`/used-cars/${listingId}`);
  return { ok: true };
}

export async function removeUsedCarVideo(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const listingId = str(fd, "listingId");
  if (!listingId) return { error: "Missing listing id." };

  await prisma.usedCarListing.update({ where: { id: listingId }, data: { videoUrl: null } });
  revalidateUsedCars();
  revalidatePath(`/used-cars/${listingId}`);
  return { ok: true };
}
