"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LMap, Marker as LMarker } from "leaflet";

/**
 * Dealer/location map.
 *
 * Everything here is FREE and needs no API key or billing account:
 *  - The map itself is drawn with Leaflet + OpenStreetMap tiles.
 *  - "View on Google Maps" opens the real business listing — where Google's
 *    own photos, Street View and reviews are — via a plain Maps URL. (Embedding
 *    those photos INSIDE this app would need the paid Google Places API, so we
 *    link out to Google Maps instead, which is free.)
 *  - "Get directions" opens Google Maps routing, also via a plain URL.
 *
 * Reusable: New Cars detail uses it now; the shipment tracker can adopt it.
 */

const PIN_SVG = `
<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
  <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z"
        fill="#c1442d"/>
  <circle cx="15" cy="15" r="6" fill="#fff"/>
</svg>`;

/**
 * Opens the place on Google Maps by NAME (not raw coordinates), so Maps resolves
 * to the actual business listing and shows its photos/Street View. Free URL, no
 * key. `place` is a human query like "Navana Toyota — Gulshan, Gulshan 1, Dhaka".
 */
const placeUrl = (place: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;

/** Google Maps routing to a coordinate. Free URL, no key. */
const directionsTo = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

export function DealerMap({
  name,
  address,
  latitude,
  longitude,
  height = 240,
}: {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  height?: number;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const markerRef = useRef<LMarker | null>(null);

  // Human search string that resolves to the real business listing on Google
  // Maps (so its photos/Street View show). Em dash dropped to help matching.
  const query = `${name.replace(/\s*—\s*/g, " ")}, ${address}, Dhaka`;
  const place = placeUrl(query);

  // The pin's click handler is bound once; this ref lets it use the CURRENT
  // dealer after the selection changes (kept in sync by an effect below).
  const placeRef = useRef(place);

  // Create the map once. Leaflet touches window, so it's imported dynamically
  // inside the effect (client-only) rather than at module scope.
  useEffect(() => {
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !elRef.current || mapRef.current) return;

      const map = L.map(elRef.current, { scrollWheelZoom: false }).setView(
        [latitude, longitude],
        16,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: PIN_SVG,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -38],
      });
      const marker = L.marker([latitude, longitude], { icon }).addTo(map);

      // Clicking the pin opens the branch on Google Maps, where its photos are.
      marker.on("click", () => window.open(placeRef.current, "_blank", "noopener"));

      mapRef.current = map;
      markerRef.current = marker;

      // Tiles can render blank if the container sized after init.
      setTimeout(() => map.invalidateSize(), 60);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Created once; selecting a different dealer is handled by the next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the pin's click target pointing at the currently selected dealer.
  useEffect(() => {
    placeRef.current = place;
  }, [place]);

  // Re-center and move the pin when the selected dealer changes.
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([latitude, longitude], 16);
      markerRef.current.setLatLng([latitude, longitude]);
    }
  }, [latitude, longitude]);

  return (
    <div className="isolate">
      {/* z-0 keeps Leaflet's internal high z-indexes below the sticky header */}
      <div
        ref={elRef}
        role="application"
        aria-label={`Map showing ${name}`}
        className="relative z-0 overflow-hidden rounded-xl border border-border"
        style={{ height }}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2.5">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-text">{name}</p>
          <p className="truncate text-[12px] text-muted">{address}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <a
            href={place}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[9px] bg-accent px-3.5 py-2 text-[12.5px] font-bold text-on-accent transition hover:bg-accent-hover"
          >
            View on Google Maps
          </a>
          <a
            href={directionsTo(latitude, longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[9px] bg-ink px-3.5 py-2 text-[12.5px] font-bold text-white transition hover:bg-accent hover:text-on-accent"
          >
            Directions &rarr;
          </a>
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-dim">
        Tap the pin or &ldquo;View on Google Maps&rdquo; to see the branch&apos;s photos and
        Street View.
      </p>
    </div>
  );
}
