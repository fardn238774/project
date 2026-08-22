"use server";

import { requireUser } from "@/lib/session";

/**
 * Real service-center finder — no simulation, no paid keys.
 *  - `geocodeArea` turns a typed place ("Dhanmondi, Dhaka") into coordinates via
 *    OpenStreetMap Nominatim (free).
 *  - `searchServiceCenters` returns actual car repair / tyre / parts / wash shops
 *    around a coordinate from the OpenStreetMap Overpass API (free), sorted by
 *    real distance. The browser supplies "near me" coordinates via geolocation.
 *
 * These run server-side so there are no CORS issues and we can send the polite
 * User-Agent both services ask for.
 */

export type ServiceCenter = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  distanceKm: number;
  address: string | null;
  phone: string | null;
};

export type GeocodeResult = { lat: number; lng: number; label: string } | { error: string };
export type SearchResult = { centers: ServiceCenter[] } | { error: string };

export type RouteResult =
  | { distanceKm: number; durationMin: number; line: [number, number][] }
  | { error: string };

const UA = "AutoBD/1.0 (car marketplace service-center finder)";

const CATEGORY: Record<string, string> = {
  car_repair: "Car repair",
  car: "Car dealer",
  tyres: "Tyres",
  car_parts: "Car parts",
  car_wash: "Car wash",
  fuel: "Fuel station",
};

/** Great-circle distance in km. */
function haversine(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export async function geocodeArea(query: string): Promise<GeocodeResult> {
  await requireUser();
  const q = query.trim();
  if (!q) return { error: "Type an area, city or address to search." };

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "en" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { error: "Location lookup failed. Please try again." };
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!Array.isArray(data) || data.length === 0) return { error: `No place found for “${q}”.` };
    return { lat: Number(data[0].lat), lng: Number(data[0].lon), label: data[0].display_name };
  } catch {
    return { error: "Couldn't reach the location service. Please try again." };
  }
}

export async function searchServiceCenters(
  lat: number,
  lng: number,
  radiusKm = 8,
): Promise<SearchResult> {
  await requireUser();
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: "Invalid location." };

  const radius = Math.round(Math.min(Math.max(radiusKm, 1), 25) * 1000); // metres, capped
  const query = `[out:json][timeout:25];
(
  node["shop"="car_repair"](around:${radius},${lat},${lng});
  way["shop"="car_repair"](around:${radius},${lat},${lng});
  node["shop"="car"](around:${radius},${lat},${lng});
  node["shop"="tyres"](around:${radius},${lat},${lng});
  node["shop"="car_parts"](around:${radius},${lat},${lng});
  node["amenity"="car_wash"](around:${radius},${lat},${lng});
);
out center 80;`;

  // The free public Overpass instances are frequently busy (504/429), so try a
  // few mirrors in turn until one answers. All are free and need no key.
  const ENDPOINTS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
  ];

  let data: { elements?: unknown[] } | null = null;
  let lastStatus = 0;
  // Two passes over the mirrors with a short backoff — the free instances are
  // often busy in bursts, and a second attempt usually gets through.
  for (let pass = 0; pass < 2 && !data; pass++) {
    if (pass > 0) await new Promise((r) => setTimeout(r, 1800));
    for (const endpoint of ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(22000),
        });
        if (res.ok) {
          data = await res.json();
          break;
        }
        lastStatus = res.status;
      } catch {
        // network error / timeout — fall through to the next mirror
      }
    }
  }
  if (!data) {
    return {
      error: `The map data service is busy right now${lastStatus ? ` (${lastStatus})` : ""}. Please try again in a moment.`,
    };
  }

  const elements = Array.isArray(data.elements) ? data.elements : [];
  const seen = new Set<string>();
  const centers: ServiceCenter[] = [];

  for (const raw of elements) {
    const el = raw as {
      type: string;
      id: number;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    };
    const t = el.tags ?? {};
    const name = t.name || t.operator;
    if (!name) continue; // skip unnamed POIs

    const plat = el.lat ?? el.center?.lat;
    const plng = el.lon ?? el.center?.lon;
    if (typeof plat !== "number" || typeof plng !== "number") continue;

    const id = `${el.type}/${el.id}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const key = t.shop || t.amenity || "";
    const address =
      [t["addr:housenumber"], t["addr:street"], t["addr:suburb"] || t["addr:city"]]
        .filter(Boolean)
        .join(", ") || null;

    centers.push({
      id,
      name,
      category: CATEGORY[key] ?? "Service center",
      lat: plat,
      lng: plng,
      distanceKm: haversine(lat, lng, plat, plng),
      address,
      phone: t.phone || t["contact:phone"] || null,
    });
  }

  centers.sort((a, b) => a.distanceKm - b.distanceKm);
  return { centers: centers.slice(0, 40) };
}

/**
 * Real driving route from the user's origin to a chosen service center, using
 * the free public OSRM demo server (no key). Returns the true road distance,
 * estimated drive time, and the road geometry to draw on the map — the same
 * thing Google Maps shows when you pick a destination.
 */
export async function routeBetween(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<RouteResult> {
  await requireUser();
  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
    return { error: "Invalid coordinates." };
  }

  // OSRM wants lng,lat order. overview=full + geojson gives the full road path.
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { error: "Couldn't calculate the driving route right now." };
    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{
        distance: number; // metres
        duration: number; // seconds
        geometry: { coordinates: [number, number][] };
      }>;
    };
    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route) return { error: "No drivable route found to this place." };

    // GeoJSON is [lng, lat]; Leaflet polylines want [lat, lng].
    const line = route.geometry.coordinates.map(
      ([lng, lat]) => [lat, lng] as [number, number],
    );
    return {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
      line,
    };
  } catch {
    return { error: "Couldn't reach the routing service. Please try again." };
  }
}
