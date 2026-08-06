import { LocalPhoto } from "@/components/LocalPhoto";
import { brandLogoSrcs } from "@/lib/images";

/**
 * Brand tile. Shows the real logo (web/public/brands/<slug>.png or an explicit
 * logoUrl) on a clean white chip with padding, so coloured/wordmark logos read
 * well in both themes. With no logo file it shows a monogram — the brand's
 * initial on an accent-tinted square.
 */
export function BrandMonogram({
  name,
  slug,
  logoUrl,
  size = 60,
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
      containerClassName="shrink-0 overflow-hidden rounded-2xl bg-white"
      containerStyle={{ width: size, height: size }}
      imgClassName="object-contain p-2"
      fallback={
        <div
          className="flex h-full w-full items-center justify-center bg-accent-tint font-extrabold text-accent"
          style={{ fontSize: size * 0.42 }}
          aria-hidden
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
      }
    />
  );
}
