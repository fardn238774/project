import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { bdtLakh } from "@/lib/format";
import { brandOf } from "@/lib/research";
import { BrandMonogram } from "@/components/BrandMonogram";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  const name = brand.charAt(0).toUpperCase() + brand.slice(1);
  return { title: `${name} research — AutoBD` };
}

export default async function ResearchBrandPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand } = await params;

  const all = await prisma.researchModel.findMany({
    orderBy: { name: "asc" },
    include: { marketPrice: true },
  });
  const models = all.filter((m) => brandOf(m.name).slug === brand);
  if (models.length === 0) notFound();

  const brandName = brandOf(models[0].name).name;

  return (
    <main className="mx-auto w-full max-w-[1180px] px-10 pb-20 pt-6">
      <Link href="/research" className="mb-4.5 block text-[13px] text-muted hover:text-text">
        &larr; All brands
      </Link>

      <div className="mb-7 flex items-center gap-4">
        <BrandMonogram name={brandName} slug={brand} size={56} />
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.01em] text-text">{brandName}</h1>
          <p className="text-[13px] text-dim">
            {models.length} {models.length === 1 ? "model" : "models"} researched
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {models.map((m) => (
          <Link
            key={m.id}
            href={`/research/${brand}/${m.slug}`}
            className="rounded-2xl border border-border bg-card p-4.5 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_6px_18px_rgba(0,0,0,0.06)]"
          >
            <PhotoPlaceholder height={90} radius={9} className="mb-3" />
            <p className="text-[15px] font-bold text-text">{m.name}</p>
            <p className="text-xs text-muted">{m.tagline}</p>
            {m.marketPrice && (
              <p className="mt-1.5 text-[13px] font-bold text-accent">
                Market avg {bdtLakh(m.marketPrice.avgPriceBdt)}
              </p>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}
