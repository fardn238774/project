import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { bdtLakh, num } from "@/lib/format";
import { BrandMonogram } from "@/components/BrandMonogram";

export const metadata = { title: "New Cars — AutoBD" };

export default async function NewCarBrandsPage() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { cars: true, dealers: true } },
      cars: { select: { priceMinBdt: true } },
    },
  });

  return (
    <main className="mx-auto w-full max-w-[1180px] px-10 pb-20 pt-6">
      <h1 className="mb-2 text-[30px] font-extrabold tracking-[-0.01em] text-text">
        Brand new cars
      </h1>
      <p className="mb-7 max-w-[640px] text-[15px] text-muted">
        Choose a manufacturer to browse its line-up. AutoBD is a lead &amp; booking layer —
        dealer partners fulfil every order.
      </p>

      {brands.length === 0 ? (
        <p className="text-[14px] text-muted">No brands published yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {brands.map((b) => {
            const from = b.cars.length
              ? bdtLakh(Math.min(...b.cars.map((c) => num(c.priceMinBdt))))
              : null;
            return (
              <Link
                key={b.id}
                href={`/new-cars/${b.slug}`}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(0,0,0,0.06)]"
              >
                <BrandMonogram name={b.name} slug={b.slug} logoUrl={b.logoUrl} />
                <div className="min-w-0">
                  <p className="text-[17px] font-bold text-text">{b.name}</p>
                  <p className="text-[13px] text-muted">
                    {b._count.cars} {b._count.cars === 1 ? "model" : "models"}
                    {from && ` · from ${from}`}
                  </p>
                  <p className="mt-0.5 text-[12px] text-dim">
                    {b._count.dealers} {b._count.dealers === 1 ? "dealer" : "dealers"}
                    {b.country ? ` · ${b.country}` : ""}
                  </p>
                </div>
                <span className="ml-auto text-[13px] font-bold text-accent">View &rarr;</span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
