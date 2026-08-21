"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { saveImage, saveVideo } from "@/lib/uploads";
import { PartCategory } from "@/generated/prisma/enums";
import type { SystemResult } from "@/lib/system-actions";

/**
 * Admin "System Management" actions for the Modification parts catalog:
 * create / edit / delete parts, set which chassis codes they fit, and manage
 * each part's photos + videos.
 */

const MAX_PART_PHOTOS = 8;
const MAX_PART_VIDEOS = 4;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const parseNum = (raw: string) => Number(raw.replace(/[^\d.]/g, ""));

function revalidateParts() {
  revalidatePath("/admin/system/parts");
  revalidatePath("/modifications");
}

function readPartFields(fd: FormData): {
  data?: {
    name: string;
    brand: string;
    category: PartCategory;
    priceBdt: number;
    brtaLegal: boolean;
    boltPattern: string | null;
    offsetMm: number | null;
  };
  error?: string;
} {
  const name = str(fd, "name");
  const brand = str(fd, "brand");
  if (!name) return { error: "Part name is required." };
  if (!brand) return { error: "Brand is required." };

  const catRaw = str(fd, "category");
  if (!(Object.values(PartCategory) as string[]).includes(catRaw))
    return { error: "Pick a valid category." };

  const priceBdt = parseNum(str(fd, "priceBdt"));
  if (!Number.isFinite(priceBdt) || priceBdt <= 0) return { error: "Enter a valid price." };

  const offsetRaw = str(fd, "offsetMm");
  return {
    data: {
      name,
      brand,
      category: catRaw as PartCategory,
      priceBdt,
      brtaLegal: fd.get("brtaLegal") != null,
      boltPattern: str(fd, "boltPattern") || null,
      offsetMm: offsetRaw ? Math.round(parseNum(offsetRaw)) : null,
    },
  };
}

/** The checked chassis-code checkboxes (deduped). */
function fitmentsFrom(fd: FormData): string[] {
  return [
    ...new Set(
      fd
        .getAll("chassis")
        .map(String)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

export async function createPart(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const { data, error } = readPartFields(fd);
  if (error) return { error };
  const chassis = fitmentsFrom(fd);

  await prisma.part.create({
    data: { ...data!, fitments: { create: chassis.map((chassisCode) => ({ chassisCode })) } },
  });
  revalidateParts();
  return { ok: true };
}

export async function updatePart(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const id = str(fd, "id");
  if (!id) return { error: "Missing part id." };
  const { data, error } = readPartFields(fd);
  if (error) return { error };
  const chassis = fitmentsFrom(fd);

  await prisma.$transaction([
    prisma.part.update({ where: { id }, data: data! }),
    prisma.partFitment.deleteMany({ where: { partId: id } }),
    ...(chassis.length
      ? [prisma.partFitment.createMany({ data: chassis.map((chassisCode) => ({ partId: id, chassisCode })) })]
      : []),
  ]);
  revalidateParts();
  return { ok: true };
}

export async function deletePart(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const id = str(fd, "id");
  if (!id) return { error: "Missing part id." };
  try {
    await prisma.part.delete({ where: { id } });
  } catch {
    return { error: "Couldn't delete this part." };
  }
  revalidateParts();
  return { ok: true };
}

// ------------------------------------------------------- part photos & videos

export async function addPartPhotos(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const partId = str(fd, "partId");
  if (!partId) return { error: "Missing part id." };

  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one image to upload." };

  const part = await prisma.part.findUnique({ where: { id: partId }, select: { photoUrls: true } });
  if (!part) return { error: "That part no longer exists." };
  if (part.photoUrls.length + files.length > MAX_PART_PHOTOS)
    return { error: `A part can have at most ${MAX_PART_PHOTOS} photos.` };

  const urls: string[] = [];
  for (const file of files) {
    const r = await saveImage(file, "parts");
    if (r.error) return { error: r.error };
    urls.push(r.url!);
  }
  await prisma.part.update({
    where: { id: partId },
    data: { photoUrls: { set: [...part.photoUrls, ...urls] } },
  });
  revalidateParts();
  return { ok: true };
}

export async function removePartPhoto(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const partId = str(fd, "partId");
  const url = str(fd, "url");
  if (!partId || !url) return { error: "Missing photo reference." };
  const part = await prisma.part.findUnique({ where: { id: partId }, select: { photoUrls: true } });
  if (!part) return { error: "That part no longer exists." };
  await prisma.part.update({
    where: { id: partId },
    data: { photoUrls: { set: part.photoUrls.filter((u) => u !== url) } },
  });
  revalidateParts();
  return { ok: true };
}

export async function addPartVideos(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const partId = str(fd, "partId");
  if (!partId) return { error: "Missing part id." };

  const files = fd.getAll("videos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one video to upload." };

  const part = await prisma.part.findUnique({ where: { id: partId }, select: { videoUrls: true } });
  if (!part) return { error: "That part no longer exists." };
  if (part.videoUrls.length + files.length > MAX_PART_VIDEOS)
    return { error: `A part can have at most ${MAX_PART_VIDEOS} videos.` };

  const urls: string[] = [];
  for (const file of files) {
    const r = await saveVideo(file, "part-videos");
    if (r.error) return { error: r.error };
    urls.push(r.url!);
  }
  await prisma.part.update({
    where: { id: partId },
    data: { videoUrls: { set: [...part.videoUrls, ...urls] } },
  });
  revalidateParts();
  return { ok: true };
}

export async function removePartVideo(_prev: SystemResult, fd: FormData): Promise<SystemResult> {
  await requireAdmin();
  const partId = str(fd, "partId");
  const url = str(fd, "url");
  if (!partId || !url) return { error: "Missing video reference." };
  const part = await prisma.part.findUnique({ where: { id: partId }, select: { videoUrls: true } });
  if (!part) return { error: "That part no longer exists." };
  await prisma.part.update({
    where: { id: partId },
    data: { videoUrls: { set: part.videoUrls.filter((u) => u !== url) } },
  });
  revalidateParts();
  return { ok: true };
}
