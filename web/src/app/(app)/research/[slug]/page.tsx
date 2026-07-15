import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/format";
import { TcoCalculator } from "./TcoCalculator";

export default async function ResearchDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const model = await prisma.researchModel.findUnique({
    where: { slug },
    include: { issues: true },
  });
  if (!model) notFound();

  return (
    <main className="mx-auto w-full max-w-[900px] px-10 pb-20 pt-6">
      <Link href="/research" className="mb-4.5 block text-[13px] text-muted hover:text-text">
        &larr; Back to research hub
      </Link>
      <h1 className="mb-5 text-[30px] font-extrabold text-text">{model.name}</h1>

      <section className="mb-4 rounded-2xl border border-border bg-card p-[22px]">
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          Generations &amp; specs
        </h2>
        <p className="text-sm leading-[1.7] text-text">{model.specs}</p>
      </section>

      <section className="mb-4 rounded-2xl border border-border bg-card p-[22px]">
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          Common reliability issues
        </h2>
        <div className="grid gap-2">
          {model.issues.map((issue) => (
            <p
              key={issue.id}
              className="rounded-[9px] bg-chip px-3 py-2.25 text-[13.5px] text-text"
            >
              {issue.text}
            </p>
          ))}
        </div>
      </section>

      <TcoCalculator
        regTaxBdt={num(model.regTaxBdt)}
        tokenTaxBdt={num(model.tokenTaxBdt)}
        insuranceBdt={num(model.insuranceBdt)}
        fuelPricePerL={num(model.fuelPricePerL)}
        kmPerL={num(model.kmPerL)}
      />
    </main>
  );
}
