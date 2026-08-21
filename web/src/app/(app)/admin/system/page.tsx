import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { ListingStatus } from "@/generated/prisma/enums";

export const metadata = { title: "System Management — AutoBD" };

export default async function SystemManagementPage() {
  await requireAdmin();

  const [brandCount, carCount, listingCount, pendingCount, orgCount, auctionCount, partCount] =
    await Promise.all([
      prisma.brand.count(),
      prisma.newCar.count(),
      prisma.usedCarListing.count(),
      prisma.usedCarListing.count({ where: { status: ListingStatus.PENDING_VERIFICATION } }),
      prisma.organization.count(),
      prisma.auction.count(),
      prisma.part.count(),
    ]);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-10 pb-20 pt-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold text-text">System Management</h1>
          <p className="mt-1 text-[14px] text-muted">
            Manage the platform&apos;s catalog content directly. Pick a module below.
          </p>
        </div>
        <Link href="/admin" className="text-[13px] text-muted hover:text-accent">
          &larr; Back to admin
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/admin/system/new-cars"
          className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)]"
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-tint text-[20px]">
            🚗
          </div>
          <p className="text-[17px] font-extrabold text-text">New Cars Catalog</p>
          <p className="mt-1 text-[13px] leading-[1.5] text-muted">
            Add, edit or remove brands and their car models — full details, variants and photos.
          </p>
          <p className="mt-4 border-t border-border pt-3 text-[13px] text-dim">
            <span className="font-bold text-text">{brandCount}</span>{" "}
            {brandCount === 1 ? "brand" : "brands"} ·{" "}
            <span className="font-bold text-text">{carCount}</span>{" "}
            {carCount === 1 ? "model" : "models"}
            <span className="float-right font-bold text-accent transition group-hover:translate-x-0.5">
              Manage &rarr;
            </span>
          </p>
        </Link>

        <Link
          href="/admin/system/used-cars"
          className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)]"
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-tint text-[20px]">
            📋
          </div>
          <p className="text-[17px] font-extrabold text-text">
            Used Cars Catalog
            {pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-accent px-2 py-0.5 align-middle text-[11px] font-bold text-on-accent">
                {pendingCount} to review
              </span>
            )}
          </p>
          <p className="mt-1 text-[13px] leading-[1.5] text-muted">
            Approve or reject seller submissions, and add, edit or remove listings — photos, video and
            all the details.
          </p>
          <p className="mt-4 border-t border-border pt-3 text-[13px] text-dim">
            <span className="font-bold text-text">{listingCount}</span>{" "}
            {listingCount === 1 ? "listing" : "listings"}
            <span className="float-right font-bold text-accent transition group-hover:translate-x-0.5">
              Manage &rarr;
            </span>
          </p>
        </Link>

        <Link
          href="/admin/system/reconditioned"
          className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)]"
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-tint text-[20px]">
            🏷️
          </div>
          <p className="text-[17px] font-extrabold text-text">Reconditioned Import</p>
          <p className="mt-1 text-[13px] leading-[1.5] text-muted">
            Manage bidding organizations, auction sessions, dates and the cars in each — photos and
            videos included.
          </p>
          <p className="mt-4 border-t border-border pt-3 text-[13px] text-dim">
            <span className="font-bold text-text">{orgCount}</span> {orgCount === 1 ? "org" : "orgs"} ·{" "}
            <span className="font-bold text-text">{auctionCount}</span>{" "}
            {auctionCount === 1 ? "auction" : "auctions"}
            <span className="float-right font-bold text-accent transition group-hover:translate-x-0.5">
              Manage &rarr;
            </span>
          </p>
        </Link>

        <Link
          href="/admin/system/parts"
          className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)]"
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-tint text-[20px]">
            🔧
          </div>
          <p className="text-[17px] font-extrabold text-text">Parts Catalog</p>
          <p className="mt-1 text-[13px] leading-[1.5] text-muted">
            Add, edit or remove modification parts — fitment by car, pricing, photos and videos.
          </p>
          <p className="mt-4 border-t border-border pt-3 text-[13px] text-dim">
            <span className="font-bold text-text">{partCount}</span>{" "}
            {partCount === 1 ? "part" : "parts"}
            <span className="float-right font-bold text-accent transition group-hover:translate-x-0.5">
              Manage &rarr;
            </span>
          </p>
        </Link>

        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 opacity-70">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-chip text-[20px]">
            ➕
          </div>
          <p className="text-[17px] font-extrabold text-text">More modules</p>
          <p className="mt-1 text-[13px] leading-[1.5] text-muted">
            Additional management tools will appear here as they&apos;re added.
          </p>
        </div>
      </div>
    </main>
  );
}
