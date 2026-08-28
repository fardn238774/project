import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Served at /sitemap.xml. Lists the public, indexable pages so Google can
 * discover them. Logged-in app pages are intentionally omitted — they redirect
 * to the login wall and shouldn't appear in search results.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/welcome`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/login`, lastModified, changeFrequency: "monthly", priority: 0.5 },
  ];
}
