import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";

export const metadata = { title: "Research Hub — AutoBD" };

export default async function ResearchPage() {
  const models = await prisma.researchModel.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="mx-auto w-full max-w-[1180px] px-10 pb-20 pt-6">
      <h1 className="mb-2 text-[30px] font-extrabold text-text">Dream Car Research Hub</h1>
      <p className="mb-7 max-w-[640px] text-[15px] text-muted">
        Specs, reliability data, and Bangladesh-specific total cost of ownership for popular
        JDM and BD-market models.
      </p>

      {models.length === 0 ? (
        <p className="text-[14px] text-muted">No research models published yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {models.map((m) => (
            <Link
              key={m.id}
              href={`/research/${m.slug}`}
              className="rounded-2xl border border-border bg-card p-4.5 transition hover:shadow-[0_6px_18px_rgba(0,0,0,0.06)]"
            >
              <PhotoPlaceholder height={90} radius={9} className="mb-3" />
              <p className="text-[15px] font-bold text-text">{m.name}</p>
              <p className="text-xs text-muted">{m.tagline}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
