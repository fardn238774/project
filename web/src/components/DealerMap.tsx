"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LMap, Marker as LMarker } from "leaflet";

/**
 * Dealer/location map.
 *
 * Displayed with Leaflet + OpenStreetMap tiles — free, no API key, no billing —
 * so the real location and marker always render (no "waiting on a key" state).
 * Navigation ("take me to the showroom") uses a Google Maps directions
 * deep-link, which also needs no key and opens the user's Google Maps app.
 *
 * Reusable: New Cars detail uses it now; the shipment tracker can adopt it.
 */

const PIN_SVG = `
<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
  <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z"
        fill="#c1442d"/>
  <circle cx="15" cy="15" r="6" fill="#fff"/>
</svg>`;

/** Directions to a coordinate — opens Google Maps routing, no key needed. */
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

      // Clicking the pin (or its popup link) routes to the showroom.
      const openDirections = () => {
        const { lat, lng } = marker.getLatLng();
        window.open(directionsTo(lat, lng), "_blank", "noopener");
      };
      marker.on("click", openDirections);

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
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-text">{name}</p>
          <p className="truncate text-[12px] text-muted">{address}</p>
        </div>
        <a
          href={directionsTo(latitude, longitude)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-[9px] bg-ink px-3.5 py-2 text-[12.5px] font-bold text-white transition hover:bg-accent hover:text-on-accent"
        >
          Get directions &rarr;
        </a>
      </div>
    </div>
  );
}
