import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { bdtLakh } from "@/lib/format";
import { brandOf } from "@/lib/research";
import { BrandMonogram } from "@/components/BrandMonogram";

export const metadata = { title: "Research Hub — AutoBD" };

export default async function ResearchBrandsPage() {
  const models = await prisma.researchModel.findMany({
    orderBy: { name: "asc" },
    include: { marketPrice: true },
  });

  // Group models by their (derived) brand, so the Hub opens on brands first —
  // like the New Cars flow: brand → models → research detail.
  const map = new Map<string, { name: string; slug: string; models: typeof models }>();
  for (const m of models) {
    const b = brandOf(m.name);
    const entry = map.get(b.slug) ?? { name: b.name, slug: b.slug, models: [] };
    entry.models.push(m);
    map.set(b.slug, entry);
  }
  const brands = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="mx-auto w-full max-w-[1180px] px-10 pb-20 pt-6">
      <h1 className="mb-2 text-[30px] font-extrabold tracking-[-0.01em] text-text">
        Dream Car Research Hub
      </h1>
      <p className="mb-7 max-w-[640px] text-[15px] text-muted">
        Pick a brand to explore its popular models — live market prices, reliability notes,
        parts &amp; maintenance costs and a Bangladesh total-cost-of-ownership calculator.
      </p>

      {brands.length === 0 ? (
        <p className="text-[14px] text-muted">No research models published yet.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {brands.map((b) => {
            const avgs = b.models
              .map((m) => m.marketPrice?.avgPriceBdt)
              .filter((n): n is number => typeof n === "number");
            const from = avgs.length ? bdtLakh(Math.min(...avgs)) : null;
            return (
              <Link
                key={b.slug}
                href={`/research/${b.slug}`}
                className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)]"
              >
                <div className="mb-5 flex items-center gap-4">
                  <BrandMonogram name={b.name} slug={b.slug} size={64} />
                  <div className="min-w-0">
                    <p className="text-[19px] font-extrabold tracking-[-0.01em] text-text">
                      {b.name}
                    </p>
                    <p className="truncate text-[12.5px] text-dim">
                      {b.models.map((m) => m.name.replace(`${b.name} `, "")).join(" · ")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <p className="text-[13px] text-muted">
                    <span className="font-bold text-text">{b.models.length}</span>{" "}
                    {b.models.length === 1 ? "model" : "models"}
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
