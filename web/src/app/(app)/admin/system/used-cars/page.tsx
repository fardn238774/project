import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { bdtLakh, km, num } from "@/lib/format";
import { ListingStatus } from "@/generated/prisma/enums";
import { ListingReviewButtons } from "../../AdminControls";
import { UsedCarsManager, type Listing } from "./UsedCarsManager";

export const metadata = { title: "Used Cars Catalog — System Management" };

export default async function UsedCarsManagementPage() {
  await requireAdmin();

  const [pending, all, buyers] = await Promise.all([
    prisma.usedCarListing.findMany({
      where: { status: ListingStatus.PENDING_VERIFICATION },
      orderBy: { createdAt: "asc" },
      include: { seller: { select: { fullName: true } } },
    }),
    prisma.usedCarListing.findMany({
      orderBy: { createdAt: "desc" },
      include: { seller: { select: { fullName: true } } },
    }),
    prisma.buyer.findMany({ select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]);

  const listings: Listing[] = all.map((l) => ({
    id: l.id,
    title: l.title,
    make: l.make,
    model: l.model,
    manufactureYear: l.manufactureYear,
    mileageKm: l.mileageKm,
    location: l.location,
    priceBdt: num(l.priceBdt),
    conditionNotes: l.conditionNotes,
    accidentStatus: l.accidentStatus,
    status: l.status,
    transmission: l.transmission,
    fuelType: l.fuelType,
    engineCc: l.engineCc,
    color: l.color,
    registrationNumber: l.registrationNumber,
    registrationYear: l.registrationYear,
    photoUrls: l.photoUrls,
    videoUrl: l.videoUrl,
    sellerName: l.seller.fullName,
  }));

  return (
    <main className="mx-auto w-full max-w-[1080px] px-10 pb-24 pt-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold text-text">Used Cars Catalog</h1>
          <p className="mt-1 text-[14px] text-muted">
            Review seller submissions, and add, edit or remove any used-car listing.
          </p>
        </div>
        <Link href="/admin/system" className="text-[13px] text-muted hover:text-accent">
          &larr; System Management
        </Link>
      </div>

      {/* ---------- Approval / reject panel ---------- */}
      <section className="mb-7 rounded-2xl border border-border bg-card p-[22px]">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
            Pending approval
          </h2>
          {pending.length > 0 && (
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-on-accent">
              {pending.length} awaiting review
            </span>
          )}
        </div>
        <p className="mb-4 text-[13px] text-muted">
          Sellers submit their car with full details, registration information and the car&apos;s
          auction sheet. Check the paperwork, then approve to publish it, or reject with a reason.
        </p>

        {pending.length === 0 ? (
          <p className="py-3 text-[13px] text-dim">No listings awaiting review.</p>
        ) : (
          pending.map((l) => (
            <div key={l.id} className="border-t border-track py-4 first:border-t-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text">{l.title}</p>
                  <p className="mt-0.5 text-xs text-dim">
                    {`${l.manufactureYear} ${l.make} ${l.model} · ${km(l.mileageKm)} km · ${l.location}`}
                  </p>
                  <p className="mt-0.5 text-xs text-dim">
                    {`Seller: ${l.seller.fullName} · Reg: ${l.registrationNumber ?? "—"}`}
                    {l.registrationYear ? ` (${l.registrationYear})` : ""}
                    {l.transmission ? ` · ${l.transmission}` : ""}
                    {l.fuelType ? ` · ${l.fuelType}` : ""}
                    {l.engineCc ? ` · ${l.engineCc}cc` : ""}
                  </p>
                </div>
                <p className="whitespace-nowrap text-sm font-extrabold text-accent">
                  {bdtLakh(l.priceBdt)}
                </p>
              </div>

              <p className="mt-2 line-clamp-3 text-[13px] leading-[1.55] text-muted">
                {l.conditionNotes}
              </p>

              {(l.photoUrls.length > 0 || l.videoUrl) && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {l.photoUrls.slice(0, 6).map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt={`${l.title} photo ${i + 1}`}
                      className="h-11 w-14 rounded border border-border object-cover"
                    />
                  ))}
                  {l.photoUrls.length > 6 && (
                    <span className="text-xs text-dim">+{l.photoUrls.length - 6} more</span>
                  )}
                  {l.videoUrl && (
                    <a
                      href={l.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-border px-2 py-1 text-xs font-bold text-text hover:border-accent hover:text-accent"
                    >
                      ▶ Video
                    </a>
                  )}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                {l.auctionSheetUrl ? (
                  <a
                    href={l.auctionSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-1.75 text-xs font-bold text-text hover:border-accent hover:text-accent"
                  >
                    View auction sheet ↗
                  </a>
                ) : (
                  <span className="text-xs text-dim">No auction sheet attached.</span>
                )}
                <ListingReviewButtons listingId={l.id} />
              </div>
            </div>
          ))
        )}
      </section>

      {/* ---------- Catalog management ---------- */}
      <section>
        <h2 className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          All listings — edit info, photos, video &amp; delete
        </h2>
        <UsedCarsManager listings={listings} sellers={buyers} />
      </section>
    </main>
  );
}
