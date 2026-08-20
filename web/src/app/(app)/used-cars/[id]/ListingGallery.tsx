"use client";

import { useState } from "react";

/** Cover image + clickable thumbnail strip for a listing's seller-uploaded photos. */
export function ListingGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const main = photos[active] ?? photos[0];

  return (
    <div className="mb-4.5">
      <div className="overflow-hidden rounded-2xl border border-border bg-chip">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={main} alt={alt} className="h-[340px] w-full object-cover" />
      </div>
      {photos.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {photos.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              className={`h-16 w-20 overflow-hidden rounded-md border transition ${
                i === active
                  ? "border-accent ring-1 ring-accent"
                  : "border-border opacity-80 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${alt} thumbnail ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
