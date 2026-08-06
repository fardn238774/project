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
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {brands.map((b) => {
            const from = b.cars.length
              ? bdtLakh(Math.min(...b.cars.map((c) => num(c.priceMinBdt))))
              : null;
            return (
              <Link
                key={b.id}
                href={`/new-cars/${b.slug}`}
                className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)]"
              >
                <div className="mb-5 flex items-center gap-4">
                  <BrandMonogram name={b.name} slug={b.slug} logoUrl={b.logoUrl} size={64} />
                  <div className="min-w-0">
                    <p className="text-[19px] font-extrabold tracking-[-0.01em] text-text">
                      {b.name}
                    </p>
                    <p className="text-[12.5px] text-dim">
                      {b.country ? `${b.country} · ` : ""}
                      {b._count.dealers} {b._count.dealers === 1 ? "dealer" : "dealers"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <p className="text-[13px] text-muted">
                    <span className="font-bold text-text">{b._count.cars}</span>{" "}
                    {b._count.cars === 1 ? "model" : "models"}
                    {from && (
                      <>
                        {" · from "}
                        <span className="font-bold text-text">{from}</span>
                      </>
                    )}
                  </p>
                  <span className="text-[13px] font-bold text-accent transition group-hover:translate-x-0.5">
                    View &rarr;
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
