import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { num } from "@/lib/format";
import { NewCarsManager } from "./NewCarsManager";

export const metadata = { title: "New Cars Catalog — System Management" };

export default async function NewCarsManagementPage() {
  await requireAdmin();

  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: {
      cars: {
        orderBy: { model: "asc" },
        include: { variants: { orderBy: { priceBdt: "asc" } } },
      },
    },
  });

  // Prisma Decimals aren't serializable to a client component — convert to plain
  // numbers so NewCarsManager (client) can render and edit them.
  const data = brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    country: b.country,
    logoUrl: b.logoUrl,
    cars: b.cars.map((c) => ({
      id: c.id,
      model: c.model,
      priceMinBdt: num(c.priceMinBdt),
      priceMaxBdt: num(c.priceMaxBdt),
      warrantyYears: c.warrantyYears,
      warrantyKm: c.warrantyKm,
      // Guard against a stale Prisma client (dev server started before the
      // photoUrls/videoUrls columns existed) returning undefined instead of [].
      photoUrls: c.photoUrls ?? [],
      videoUrls: c.videoUrls ?? [],
      variants: c.variants.map((v) => ({
        id: v.id,
        name: v.name,
        priceBdt: num(v.priceBdt),
        engine: v.engine,
        transmission: v.transmission,
        economyKmPerL: num(v.economyKmPerL),
      })),
    })),
  }));

  return (
    <main className="mx-auto w-full max-w-[1080px] px-10 pb-24 pt-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold text-text">New Cars Catalog</h1>
          <p className="mt-1 text-[14px] text-muted">
            Everything here is live on the public New Cars pages the moment you save.
          </p>
        </div>
        <Link href="/admin/system" className="text-[13px] text-muted hover:text-accent">
          &larr; System Management
        </Link>
      </div>

      <NewCarsManager brands={data} />
    </main>
  );
}
