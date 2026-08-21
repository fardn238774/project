import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { num } from "@/lib/format";
import { chassisOptions } from "@/lib/vehicles";
import { PartsManager, type Part } from "./PartsManager";

export const metadata = { title: "Parts Catalog — System Management" };

export default async function PartsManagementPage() {
  await requireAdmin();

  const rows = await prisma.part.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { fitments: true },
  });

  const parts: Part[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    priceBdt: num(p.priceBdt),
    brtaLegal: p.brtaLegal,
    boltPattern: p.boltPattern,
    offsetMm: p.offsetMm,
    photoUrls: p.photoUrls,
    videoUrls: p.videoUrls,
    fits: p.fitments.map((f) => f.chassisCode),
  }));

  return (
    <main className="mx-auto w-full max-w-[1080px] px-10 pb-24 pt-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold text-text">Parts Catalog</h1>
          <p className="mt-1 text-[14px] text-muted">
            Add, edit or remove modification parts — fitment, pricing, photos and videos. Changes are
            live on the Modification Studio instantly.
          </p>
        </div>
        <Link href="/admin/system" className="text-[13px] text-muted hover:text-accent">
          &larr; System Management
        </Link>
      </div>

      <PartsManager parts={parts} chassisOptions={chassisOptions()} />
    </main>
  );
}
