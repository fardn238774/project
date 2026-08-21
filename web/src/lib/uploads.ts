import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Shared server-side upload helper. Writes an uploaded file under
 * public/uploads/<subdir> and returns its public path (e.g. /uploads/new-cars/x.jpg).
 * Server-only (uses node:fs) — never import this from a client component.
 *
 * Note: files go to the local filesystem, fine for local dev / self-hosting.
 * A serverless deploy would swap this block for object storage.
 */

/** Accepted image upload types → file extension. */
export const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB each

/** Accepted video upload types → file extension. */
export const VIDEO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
};

export const MAX_VIDEO_BYTES = 60 * 1024 * 1024; // 60 MB each

export async function saveUpload(file: File, subdir: string, ext: string): Promise<string> {
  const fileName = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${subdir}/${fileName}`;
}

export type SavedMedia = { url?: string; error?: string };

/** Save one uploaded image, validating type + size. */
export async function saveImage(file: File, subdir: string): Promise<SavedMedia> {
  const ext = IMAGE_EXT[file.type];
  if (!ext) return { error: "Photos must be JPG, PNG or WebP." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Each photo must be 6 MB or smaller." };
  return { url: await saveUpload(file, subdir, ext) };
}

/** Save one uploaded video, validating type + size. */
export async function saveVideo(file: File, subdir: string): Promise<SavedMedia> {
  const ext = VIDEO_EXT[file.type];
  if (!ext) return { error: "Videos must be MP4, WebM, MOV or MKV." };
  if (file.size > MAX_VIDEO_BYTES) return { error: "Each video must be 60 MB or smaller." };
  return { url: await saveUpload(file, subdir, ext) };
}
