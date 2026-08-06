/**
 * Local image conventions for New Cars.
 *
 * Images live in web/public and are matched by a predictable filename, so
 * there is no database column to edit and no reseed needed — drop a correctly
 * named file in the folder and it shows; if it's missing, the UI falls back to
 * the placeholder/monogram. Several extensions are tried, so .jpg / .png /
 * .webp all work.
 */

/** "City e:HEV" -> "city-e-hev". Also used to build filenames. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CAR_EXTS = ["jpg", "jpeg", "png", "webp"];
const LOGO_EXTS = ["png", "svg", "jpg", "jpeg", "webp"];

/**
 * Candidate paths for a car photo, e.g. brand "toyota" + model
 * "Corolla Cross Hybrid" -> /cars/toyota-corolla-cross-hybrid.jpg (and other
 * extensions). Drop your file at web/public/cars/<that name>.
 */
export function carImageSrcs(brandSlug: string, model: string): string[] {
  const base = `/cars/${brandSlug}-${slugify(model)}`;
  return CAR_EXTS.map((ext) => `${base}.${ext}`);
}

/**
 * Candidate paths for a brand logo: an explicit logoUrl (if set) first, then
 * /brands/<slug>.png (and other extensions). Drop your file at
 * web/public/brands/<slug>.png.
 */
export function brandLogoSrcs(slug: string, logoUrl?: string | null): string[] {
  const conv = LOGO_EXTS.map((ext) => `/brands/${slug}.${ext}`);
  return logoUrl ? [logoUrl, ...conv] : conv;
}
