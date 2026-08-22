"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LMap, Marker as LMarker, LayerGroup } from "leaflet";
import type { ServiceCenter } from "@/lib/services-actions";

const CENTER_PIN = `
<svg width="26" height="36" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
  <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="#c1442d"/>
  <circle cx="15" cy="15" r="6" fill="#fff"/>
</svg>`;

const YOU_PIN = `
<span style="display:block;width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,0.3)"></span>`;

export function ServiceMap({
  origin,
  centers,
  selectedId,
  onSelect,
  route = null,
  height = 400,
}: {
  origin: { lat: number; lng: number };
  centers: ServiceCenter[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  route?: [number, number][] | null;
  height?: number;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const routeLayerRef = useRef<LayerGroup | null>(null);
  const markersRef = useRef<Record<string, LMarker>>({});
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const render = () => {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;

    layer.clearLayers();
    markersRef.current = {};

    const youIcon = L.divIcon({ className: "", html: YOU_PIN, iconSize: [16, 16], iconAnchor: [8, 8] });
    L.marker([origin.lat, origin.lng], { icon: youIcon, zIndexOffset: 1000 })
      .addTo(layer)
      .bindPopup("You are here");

    const pts: [number, number][] = [[origin.lat, origin.lng]];
    const centerIcon = L.divIcon({
      className: "",
      html: CENTER_PIN,
      iconSize: [26, 36],
      iconAnchor: [13, 36],
      popupAnchor: [0, -32],
    });
    for (const c of centers) {
      const m = L.marker([c.lat, c.lng], { icon: centerIcon })
        .addTo(layer)
        .bindPopup(`<b>${c.name}</b><br>${c.category} · ${c.distanceKm.toFixed(1)} km`);
      m.on("click", () => onSelectRef.current(c.id));
      markersRef.current[c.id] = m;
      pts.push([c.lat, c.lng]);
    }

    if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
    else map.setView([origin.lat, origin.lng], 13);
  };

  // Draw (or clear) the driving route to the selected center. A thick white
  // "casing" under a blue line gives the familiar Google-Maps look, and we zoom
  // to frame the whole route from "you are here" to the destination.
  const drawRoute = () => {
    const L = LRef.current;
    const map = mapRef.current;
    const rlayer = routeLayerRef.current;
    if (!L || !map || !rlayer) return;
    rlayer.clearLayers();
    if (!route || route.length < 2) return;
    L.polyline(route, { color: "#ffffff", weight: 9, opacity: 0.9, lineCap: "round", lineJoin: "round" }).addTo(rlayer);
    const line = L.polyline(route, { color: "#1a73e8", weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" }).addTo(rlayer);
    map.fitBounds(line.getBounds(), { padding: [55, 55], maxZoom: 16 });
  };

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !elRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(elRef.current, { scrollWheelZoom: true }).setView(
        [origin.lat, origin.lng],
        13,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      // Route layer goes on first so the road line sits beneath the pins.
      routeLayerRef.current = L.layerGroup().addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 60);
      render();
      drawRoute();
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      routeLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-draw markers whenever the origin or the results change.
  useEffect(() => {
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin.lat, origin.lng, centers]);

  // Draw / clear the driving route when it changes.
  useEffect(() => {
    drawRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  // Open the selected center's popup. When a route is drawn, drawRoute() already
  // frames the view, so we only pan here if there's no route yet.
  useEffect(() => {
    const map = mapRef.current;
    const marker = selectedId ? markersRef.current[selectedId] : null;
    if (map && marker) {
      marker.openPopup();
      if (!route) map.panTo(marker.getLatLng());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div className="isolate">
      <div
        ref={elRef}
        role="application"
        aria-label="Map of nearby service centers"
        className="relative z-0 overflow-hidden rounded-2xl border border-border"
        style={{ height }}
      />
    </div>
  );
}
