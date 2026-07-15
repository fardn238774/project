import Link from "next/link";
import { requireBuyer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { bdtLakh } from "@/lib/format";
import { Pill, listingStatusPill } from "@/components/StatusChip";

export const metadata = { title: "Seller Dashboard — AutoBD" };

export default async function SellerDashboardPage() {
  const buyer = await requireBuyer();

  const listings = await prisma.usedCarListing.findMany({
    where: { sellerId: buyer.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { offers: true } } },
  });

  return (
    <main className="mx-auto w-full max-w-[900px] px-10 pb-20 pt-6">
      <Link href="/used-cars" className="mb-4.5 block text-[13px] text-muted hover:text-text">
        &larr; Back to marketplace
      </Link>
      <h1 className="mb-5.5 text-[26px] font-extrabold text-text">Seller dashboard</h1>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] border-b border-track px-5 py-3.5 text-xs uppercase text-dim">
          <span>Listing</span>
          <span>Status</span>
          <span>Offers</span>
          <span>Price</span>
        </div>

        {listings.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">
            You have no listings yet.
          </p>
        ) : (
          listings.map((l) => {
            const s = listingStatusPill(l.status);
            return (
              <Link
                key={l.id}
                href={`/used-cars/${l.id}`}
                className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center border-b border-track px-5 py-4 text-sm last:border-b-0 hover:bg-chip"
              >
                <span className="font-semibold text-text">{l.title}</span>
                <span>
                  <Pill tone={s.tone}>{s.label}</Pill>
                </span>
                <span className="text-text">{l._count.offers}</span>
                <span className="font-bold text-text">{bdtLakh(l.priceBdt)}</span>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
