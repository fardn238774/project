"use client";

import { useMemo, useState, useTransition } from "react";
import {
  geocodeArea,
  searchServiceCenters,
  routeBetween,
  type ServiceCenter,
} from "@/lib/services-actions";
import { ServiceMap } from "./ServiceMap";

type Origin = { lat: number; lng: number; label: string };
type Route = { distanceKm: number; durationMin: number; line: [number, number][] };

const RADII = [5, 10, 25];

const directionsTo = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

/** "8 min" / "1 hr 12 min" — a friendly drive-time readout. */
const fmtDur = (min: number) => {
  const m = Math.max(1, Math.round(min));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} hr ${m % 60} min`;
};

export function ServiceFinder() {
  const [query, setQuery] = useState("");
  const [radiusKm, setRadiusKm] = useState(10);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [centers, setCenters] = useState<ServiceCenter[]>([]);
  const [category, setCategory] = useState<string>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [routeMsg, setRouteMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [, startRoute] = useTransition();

  const categories = useMemo(
    () => [...new Set(centers.map((c) => c.category))].sort((a, b) => a.localeCompare(b)),
    [centers],
  );
  const filtered = useMemo(
    () => (category === "ALL" ? centers : centers.filter((c) => c.category === category)),
    [centers, category],
  );
  const selected = useMemo(
    () => centers.find((c) => c.id === selectedId) ?? null,
    [centers, selectedId],
  );

  const clearRoute = () => {
    setSelectedId(null);
    setRoute(null);
    setRouteMsg(null);
  };

  // Pick a center → ask OSRM for the real driving route from the origin.
  const selectCenter = (id: string) => {
    setSelectedId(id);
    const c = centers.find((x) => x.id === id);
    if (!origin || !c) return;
    setRoute(null);
    setRouteMsg("Calculating driving route…");
    startRoute(async () => {
      const r = await routeBetween(origin.lat, origin.lng, c.lat, c.lng);
      if ("error" in r) {
        setRoute(null);
        setRouteMsg(r.error);
        return;
      }
      setRoute(r);
      setRouteMsg(null);
    });
  };

  async function locateAndList(lat: number, lng: number, label: string, radius: number) {
    setStatus("Finding service centers nearby…");
    const r = await searchServiceCenters(lat, lng, radius);
    setStatus(null);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    setOrigin({ lat, lng, label });
    setCenters(r.centers);
    setCategory("ALL");
    clearRoute();
    if (r.centers.length === 0) {
      setError(
        "No service centers are mapped here in OpenStreetMap yet. Try a larger radius or a nearby area.",
      );
    }
  }

  const useMyLocation = () => {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Your browser can't share location. Search by area instead.");
      return;
    }
    setStatus("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus(null);
        start(() =>
          locateAndList(pos.coords.latitude, pos.coords.longitude, "Your location", radiusKm),
        );
      },
      (err) => {
        setStatus(null);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. Search by area instead."
            : "Couldn't get your location. Search by area instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  const onAreaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || pending) return;
    setError(null);
    start(async () => {
      setStatus("Locating the area…");
      const g = await geocodeArea(q);
      if ("error" in g) {
        setStatus(null);
        setError(g.error);
        return;
      }
      await locateAndList(g.lat, g.lng, g.label, radiusKm);
    });
  };

  const changeRadius = (r: number) => {
    setRadiusKm(r);
    if (origin && !pending) {
      setError(null);
      start(() => locateAndList(origin.lat, origin.lng, origin.label, r));
    }
  };

  return (
    <div className="grid gap-5">
      {/* search + radius */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <form onSubmit={onAreaSubmit} className="flex flex-wrap items-center gap-2.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search an area, city or address — e.g. Dhanmondi, Dhaka"
            aria-label="Area to search"
            className="min-w-[240px] flex-1 rounded-[10px] border border-border bg-bg px-4 py-2.5 text-sm text-text outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={pending || !query.trim()}
            className="rounded-[10px] bg-accent px-5 py-2.5 text-sm font-bold text-on-accent transition hover:bg-accent-hover disabled:opacity-60"
          >
            Search
          </button>
          <span className="text-[12px] font-semibold text-dim">or</span>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={pending}
            className="rounded-[10px] bg-ink px-4 py-2.5 text-sm font-bold text-white transition hover:bg-accent hover:text-on-accent disabled:opacity-60"
          >
            📍 Use my location
          </button>
        </form>

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-bold uppercase tracking-[0.03em] text-dim">Radius</span>
          {RADII.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => changeRadius(r)}
              disabled={pending}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition disabled:opacity-60 ${
                radiusKm === r
                  ? "bg-accent text-on-accent"
                  : "border border-border bg-bg text-text hover:border-accent"
              }`}
            >
              {r} km
            </button>
          ))}
        </div>

        {status && <p className="mt-3 text-[13px] font-semibold text-muted">{status}</p>}
        {error && <p className="mt-3 text-[13px] font-semibold text-accent">{error}</p>}
        {origin && !status && (
          <p className="mt-3 truncate text-[12.5px] text-dim">
            Showing <span className="font-semibold text-text">{filtered.length}</span>
            {category !== "ALL" ? ` of ${centers.length}` : ""} within {radiusKm} km of{" "}
            <span className="font-semibold text-text">{origin.label}</span>
          </p>
        )}
      </section>

      {origin && centers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={category === "ALL"} onClick={() => { setCategory("ALL"); clearRoute(); }}>
            All ({centers.length})
          </Chip>
          {categories.map((cat) => (
            <Chip
              key={cat}
              active={category === cat}
              onClick={() => { setCategory(cat); clearRoute(); }}
            >
              {cat} ({centers.filter((c) => c.category === cat).length})
            </Chip>
          ))}
        </div>
      )}

      {selected && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent/40 bg-accent-tint p-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-accent">
              🚗 Driving route
            </p>
            <p className="truncate text-[15px] font-bold text-text">{selected.name}</p>
          </div>
          <div className="flex items-center gap-5">
            {route ? (
              <>
                <div className="text-center">
                  <p className="text-[20px] font-extrabold leading-none text-text">
                    {route.distanceKm.toFixed(1)} km
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-dim">
                    by road
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[20px] font-extrabold leading-none text-text">
                    {fmtDur(route.durationMin)}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-dim">
                    drive time
                  </p>
                </div>
              </>
            ) : (
              <p className="text-[13px] font-semibold text-muted">
                {routeMsg ?? `${selected.distanceKm.toFixed(1)} km straight-line`}
              </p>
            )}
            <a
              href={directionsTo(selected.lat, selected.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[10px] bg-accent px-4 py-2.5 text-[13px] font-bold text-on-accent transition hover:bg-accent-hover"
            >
              Directions →
            </a>
          </div>
        </section>
      )}

      {origin ? (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <ServiceMap
            origin={origin}
            centers={filtered}
            selectedId={selectedId}
            onSelect={selectCenter}
            route={route?.line ?? null}
            height={460}
          />

          <div className="max-h-[460px] overflow-y-auto rounded-2xl border border-border bg-card">
            {filtered.length === 0 ? (
              <p className="p-5 text-[13px] text-dim">No {category === "ALL" ? "" : `${category.toLowerCase()} `}results to list.</p>
            ) : (
              filtered.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCenter(c.id)}
                  className={`block w-full border-b border-track px-4 py-3.5 text-left transition last:border-b-0 hover:bg-chip ${
                    selectedId === c.id ? "bg-accent-tint" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold text-text">
                        {i + 1}. {c.name}
                      </p>
                      <p className="mt-0.5 text-[12px] text-muted">
                        {c.category}
                        {c.address ? ` · ${c.address}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-chip px-2 py-1 text-[11px] font-bold text-text">
                      {c.distanceKm.toFixed(1)} km
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <a
                      href={directionsTo(c.lat, c.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[12px] font-bold text-accent hover:underline"
                    >
                      Directions →
                    </a>
                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[12px] font-semibold text-muted hover:text-text"
                      >
                        {c.phone}
                      </a>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <section className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-tint text-[24px]">
            🔧
          </div>
          <p className="text-[15px] font-bold text-text">Find a car service center near you</p>
          <p className="mx-auto mt-1.5 max-w-[460px] text-[13px] leading-[1.55] text-muted">
            Tap <span className="font-semibold">Use my location</span> or search an area. We map the
            closest car repair, tyre, parts and wash shops using live OpenStreetMap data.
          </p>
        </section>
      )}

      <p className="text-[11px] text-dim">
        Live data from OpenStreetMap (Overpass &amp; Nominatim) — free and real. Coverage depends on
        what the community has mapped in your area. Directions open in Google Maps.
      </p>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
        active
          ? "bg-ink text-white"
          : "border border-border bg-card text-muted hover:border-accent hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
