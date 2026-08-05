"use client";

/**
 * Reusable dealer/location map. Uses Google's Maps Embed API (an iframe, the
 * simplest keyed option) when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set. Until the
 * key is configured it degrades to a real static card — the dealer's actual
 * address plus an "Open in Google Maps" link (which needs no key) — rather than
 * a fake map. Coordinates come from the Dealer row, so no geocoding is needed.
 *
 * Built once here and reused wherever a location needs plotting (new-car
 * detail now; the shipment tracker can adopt it later).
 */
export function DealerMap({
  name,
  address,
  latitude,
  longitude,
  height = 220,
}: {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  height?: number;
}) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const coords = `${latitude},${longitude}`;
  // Keyless deep-link — always works, opens the native/web Google Maps app.
  const externalUrl = `https://www.google.com/maps/search/?api=1&query=${coords}`;

  if (key) {
    const src = `https://www.google.com/maps/embed/v1/place?key=${key}&q=${coords}&zoom=15`;
    return (
      <div className="overflow-hidden rounded-xl border border-border">
        <iframe
          title={`Map — ${name}`}
          src={src}
          width="100%"
          height={height}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          style={{ border: 0, display: "block" }}
          allowFullScreen
        />
        <div className="flex items-center justify-between gap-3 bg-card px-4 py-2.5">
          <span className="text-[13px] text-text">{name}</span>
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-bold text-accent hover:underline"
          >
            Open in Google Maps &rarr;
          </a>
        </div>
      </div>
    );
  }

  // No key configured — honest static fallback with the real address.
  return (
    <div
      className="flex flex-col justify-between rounded-xl border border-dashed border-border bg-chip p-4"
      style={{ minHeight: height }}
    >
      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-dim">
          Nearest dealer
        </p>
        <p className="text-[15px] font-bold text-text">{name}</p>
        <p className="text-[13px] text-muted">{address}</p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-dim">
          Interactive map appears once the Google Maps API key is set.
        </p>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap text-[12px] font-bold text-accent hover:underline"
        >
          Open in Google Maps &rarr;
        </a>
      </div>
    </div>
  );
}
