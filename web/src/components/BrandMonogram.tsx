import { LocalPhoto } from "@/components/LocalPhoto";
import { brandLogoSrcs } from "@/lib/images";

/**
 * Brand tile. Shows the real logo when a file exists at web/public/brands/
 * <slug>.png (or an explicit logoUrl); otherwise a clean monogram (the brand's
 * initial) on an accent-tinted square.
 */
export function BrandMonogram({
  name,
  slug,
  logoUrl,
  size = 56,
}: {
  name: string;
  slug: string;
  logoUrl?: string | null;
  size?: number;
}) {
  return (
    <LocalPhoto
      srcs={brandLogoSrcs(slug, logoUrl)}
      alt={`${name} logo`}
      containerClassName="shrink-0 overflow-hidden rounded-xl"
      imgClassName="object-contain"
      fallback={
        <div
          className="flex items-center justify-center rounded-xl bg-accent-tint font-extrabold text-accent"
          style={{ width: size, height: size, fontSize: size * 0.42 }}
          aria-hidden
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
      }
    />
  );
}
