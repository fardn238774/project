import Link from "next/link";
import { requireBuyer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { bdtLakh } from "@/lib/format";
import { Pill, listingStatusPill } from "@/components/StatusChip";
import { ListingStatus } from "@/generated/prisma/client";

export const metadata = { title: "Seller Dashboard — AutoBD" };

export default async function SellerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const buyer = await requireBuyer();
  const { created } = await searchParams;

  const listings = await prisma.usedCarListing.findMany({
    where: { sellerId: buyer.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { offers: true, threads: true } } },
  });

  return (
    <main className="mx-auto w-full max-w-[900px] px-10 pb-20 pt-6">
      <Link href="/used-cars" className="mb-4.5 block text-[13px] text-muted hover:text-text">
        &larr; Back to marketplace
      </Link>
      <div className="mb-5.5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-extrabold text-text">Seller dashboard</h1>
        <Link
          href="/used-cars/seller/new"
          className="whitespace-nowrap rounded-[10px] bg-accent px-4 py-2.5 text-[13px] font-bold text-on-accent transition hover:bg-accent-hover"
        >
          + List your car
        </Link>
      </div>

      {created && (
        <div className="mb-5 rounded-xl border border-[#cfe3d6] bg-[#f4f9f6] px-4 py-3 text-[13px] font-semibold text-[#2f8f5f]">
          Your car has been submitted for review. Our admin team will approve it
          before it appears on the marketplace — track its status below.
        </div>
      )}

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
                <span className="min-w-0 pr-3">
                  <span className="block font-semibold text-text">{l.title}</span>
                  {l.status === ListingStatus.REJECTED && l.rejectionReason && (
                    <span className="mt-0.5 block text-[11.5px] font-normal text-[#c1442d]">
                      Rejected: {l.rejectionReason}
                    </span>
                  )}
                  {l.status === ListingStatus.PENDING_VERIFICATION && (
                    <span className="mt-0.5 block text-[11.5px] font-normal text-dim">
                      Awaiting admin review
                    </span>
                  )}
                </span>
                <span>
                  <Pill tone={s.tone}>{s.label}</Pill>
                </span>
                <span className="text-text">
                  {l._count.offers} {l._count.offers === 1 ? "offer" : "offers"}
                  {l._count.threads > 0 && (
                    <span className="mt-0.5 block text-[11px] font-semibold text-accent">
                      {l._count.threads} chat{l._count.threads === 1 ? "" : "s"}
                    </span>
                  )}
                </span>
                <span className="font-bold text-text">{bdtLakh(l.priceBdt)}</span>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
