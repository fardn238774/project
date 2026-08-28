/**
 * Canonical public origin for the site — used by SEO metadata, the sitemap,
 * and robots.txt so every generated URL points at the real production domain.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL          — set this if you add a custom domain later
 *                                      (e.g. "https://autobd.com").
 *   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel injects your stable production
 *                                      domain automatically (e.g. "autobd.vercel.app"),
 *                                      so this "just works" once deployed.
 *   3. http://localhost:3000         — local-development fallback.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();
