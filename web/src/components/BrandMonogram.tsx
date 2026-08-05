/**
 * Brand tile. Shows the real logo when a brand has one; until logo assets are
 * supplied, falls back to a clean monogram (the brand's initial) on an
 * accent-tinted square — not a fake/placeholder image.
 */
export function BrandMonogram({
  name,
  logoUrl,
  size = 56,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${name} logo`}
        width={size}
        height={size}
        className="rounded-xl object-contain"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-xl bg-accent-tint font-extrabold text-accent"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
