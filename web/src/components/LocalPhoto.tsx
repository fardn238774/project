"use client";

import { useState } from "react";

/**
 * Renders the first working image from a list of candidate paths, over a
 * fallback. Each candidate is tried in turn; a missing/broken one advances to
 * the next. The fallback shows until an image loads, then fades OUT — so a
 * transparent logo never shows the placeholder/letter behind it.
 *
 * Used for New Cars brand logos and car photos, so dropping a correctly named
 * file into web/public is all that's needed.
 */
export function LocalPhoto({
  srcs,
  alt,
  fallback,
  imgClassName,
  containerClassName,
  containerStyle,
}: {
  srcs: string[];
  alt: string;
  /** Shown until an image loads, then hidden. */
  fallback: React.ReactNode;
  imgClassName?: string;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
}) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const src = srcs[index];

  return (
    <div className={`relative ${containerClassName ?? ""}`} style={containerStyle}>
      <div
        className="absolute inset-0"
        style={{ opacity: loaded ? 0 : 1, transition: "opacity 0.2s ease" }}
        aria-hidden={loaded}
      >
        {fallback}
      </div>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={alt}
          // A cached image can finish loading before React attaches onLoad, so
          // check `complete` on mount too — otherwise it stays invisible.
          ref={(node) => {
            if (node?.complete && node.naturalWidth > 0) setLoaded(true);
          }}
          className={`absolute inset-0 h-full w-full ${imgClassName ?? ""}`}
          style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.2s ease" }}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            setIndex((i) => i + 1);
          }}
        />
      )}
    </div>
  );
}
