import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { bdtLakhRange } from "@/lib/format";
import { BrandMonogram } from "@/components/BrandMonogram";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { LocalPhoto } from "@/components/LocalPhoto";
import { carImageSrcs } from "@/lib/images";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string }>;
}): Promise<Metadata> {
  const { brand } = await params;
  const b = await prisma.brand.findUnique({ where: { slug: brand } });
  return { title: b ? `${b.name} — New Cars — AutoBD` : "New Cars — AutoBD" };
}

export default async function BrandCarsPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand } = await params;

  const b = await prisma.brand.findUnique({
    where: { slug: brand },
    include: {
      cars: { orderBy: { priceMinBdt: "asc" } },
      _count: { select: { dealers: true } },
    },
  });
  if (!b) notFound();

  return (
    <main className="mx-auto w-full max-w-[1180px] px-10 pb-20 pt-6">
      <Link href="/new-cars" className="mb-4.5 block text-[13px] text-muted hover:text-text">
        &larr; All brands
      </Link>

      <div className="mb-7 flex items-center gap-4">
        <BrandMonogram name={b.name} slug={b.slug} logoUrl={b.logoUrl} size={64} />
        <div>
          <h1 className="text-[30px] font-extrabold tracking-[-0.01em] text-text">{b.name}</h1>
          <p className="text-[14px] text-muted">
            {b.cars.length} {b.cars.length === 1 ? "model" : "models"} · {b._count.dealers}{" "}
            {b._count.dealers === 1 ? "dealer" : "dealers"}
            {b.country ? ` · ${b.country}` : ""}
          </p>
        </div>
      </div>

      {b.cars.length === 0 ? (
        <p className="text-[14px] text-muted">No models listed for {b.name} yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {b.cars.map((car) => (
            <Link
              key={car.id}
              href={`/new-cars/${b.slug}/${car.id}`}
              className="overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-[0_6px_18px_rgba(0,0,0,0.06)]"
            >
              {car.photoUrls.length > 0 ? (
                <div className="relative h-[130px] w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={car.photoUrls[0]}
                    alt={car.model}
                    className="h-full w-full object-cover"
                  />
                  {car.videoUrls.length > 0 && (
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">
                      ▶ {car.videoUrls.length} video{car.videoUrls.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              ) : (
                <LocalPhoto
                  srcs={carImageSrcs(b.slug, car.model)}
                  alt={car.model}
                  containerClassName="h-[130px] w-full"
                  imgClassName="object-cover"
                  fallback={<PhotoPlaceholder label="product photo" height={130} radius={0} />}
                />
              )}
              <div className="p-5">
                <p className="text-[17px] font-bold text-text">{car.model}</p>
                <p className="mb-2.5 mt-1 text-sm text-muted">
                  {bdtLakhRange(car.priceMinBdt, car.priceMaxBdt)} &middot; {car.warrantyYears}
                  -year warranty
                </p>
                <p className="text-[13px] font-bold text-accent">View variants &amp; specs &rarr;</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
