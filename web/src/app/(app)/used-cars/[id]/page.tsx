import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentBuyer } from "@/lib/session";
import { getSetting } from "@/lib/settings";
import { brtaPaperValue } from "@/lib/brta";
import { bdt, bdtLakh, km } from "@/lib/format";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { Pill, verifiedPill, accidentPill } from "@/components/StatusChip";
import { OfferForm } from "./OfferForm";
import { ListingGallery } from "./ListingGallery";
import { AddToCartButton } from "@/components/AddToCartButton";
import { CartItemKind, ListingStatus, OfferStatus } from "@/generated/prisma/client";

export default async function UsedCarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [listing, buyer, maxAge] = await Promise.all([
    prisma.usedCarListing.findUnique({
      where: { id },
      include: { seller: { select: { id: true, fullName: true } } },
    }),
    currentBuyer(),
    getSetting("importEligibilityMaxAgeYears"),
  ]);
  if (!listing) notFound();

  const isOwnListing = buyer?.id === listing.sellerId;
  const isPublic =
    listing.status === ListingStatus.ACTIVE ||
    listing.status === ListingStatus.OFFER_RECEIVED ||
    listing.status === ListingStatus.SOLD;
  // Pending and rejected listings are private to their owner — everyone else
  // gets a 404 until an admin approves them. Admins review from the admin panel.
  if (!isPublic && !isOwnListing) notFound();

  const myOffer = buyer
    ? await prisma.offer.findFirst({
        where: { listingId: id, buyerId: buyer.id, status: OfferStatus.PENDING },
      })
    : null;

  const v = verifiedPill(listing.ownershipVerified);
  const a = accidentPill(listing.accidentStatus);
  const paper = brtaPaperValue(listing.manufactureYear, maxAge);

  // Structured spec rows — only the fields the seller actually provided show up.
  const detailRows: [string, string][] = [
    ["Year", String(listing.manufactureYear)],
    ["Mileage", `${km(listing.mileageKm)} km`],
  ];
  if (listing.transmission) detailRows.push(["Transmission", listing.transmission]);
  if (listing.fuelType) detailRows.push(["Fuel", listing.fuelType]);
  if (listing.engineCc) detailRows.push(["Engine", `${listing.engineCc} cc`]);
  if (listing.color) detailRows.push(["Colour", listing.color]);
  if (listing.registrationNumber) detailRows.push(["Registration", listing.registrationNumber]);
  if (listing.registrationYear) detailRows.push(["Registered", String(listing.registrationYear)]);

  const isSold = listing.status === ListingStatus.SOLD;
  const blockedReason = !buyer
    ? "Offers are available on buyer accounts."
    : isOwnListing
      ? "This is your own listing — offers appear on your seller dashboard."
      : isSold
        ? "This car has already been sold."
        : undefined;

  return (
    <main className="mx-auto w-full max-w-[900px] px-10 pb-25 pt-6">
      <Link href="/used-cars" className="mb-4.5 block text-[13px] text-muted hover:text-text">
        &larr; Back to used cars
      </Link>

      {isOwnListing && listing.status === ListingStatus.PENDING_VERIFICATION && (
        <div className="mb-4.5 rounded-xl border border-[#e7d9b0] bg-[#fdf6e3] px-4 py-3 text-[13px] font-semibold text-[#8a5b12]">
          This listing is awaiting admin review — it isn&apos;t on the public
          marketplace yet. You&apos;ll see it go live here once approved.
        </div>
      )}
      {isOwnListing && listing.status === ListingStatus.REJECTED && (
        <div className="mb-4.5 rounded-xl border border-[#f0d0c8] bg-[#fdecea] px-4 py-3 text-[13px] text-[#c1442d]">
          <span className="font-bold">This listing was rejected.</span>{" "}
          {listing.rejectionReason ?? "Please review the details and submit again."}
        </div>
      )}

      {listing.photoUrls.length > 0 ? (
        <ListingGallery photos={listing.photoUrls} alt={listing.title} />
      ) : (
        <PhotoPlaceholder label="listing photos" height={220} radius={14} className="mb-4.5" />
      )}

      <div className="mb-3.5 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-[26px] font-extrabold text-text">{listing.title}</h1>
          <p className="text-sm text-muted">
            {km(listing.mileageKm)} km &middot; {listing.location} &middot; Seller:{" "}
            {listing.seller.fullName}
          </p>
        </div>
        <p className="whitespace-nowrap text-2xl font-extrabold text-accent">
          {bdtLakh(listing.priceBdt)}
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <Pill tone={v.tone} size="md">
          {v.label}
        </Pill>
        <Pill tone={a.tone} size="md">
          {a.label}
        </Pill>
      </div>

      <section className="mb-4 rounded-2xl border border-border bg-card p-[22px]">
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          Vehicle details
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {detailRows.map(([k, val]) => (
            <div key={k}>
              <dt className="text-[11px] uppercase tracking-[0.03em] text-dim">{k}</dt>
              <dd className="text-sm font-semibold text-text">{val}</dd>
            </div>
          ))}
        </dl>
      </section>

      {listing.videoUrl && (
        <section className="mb-4 rounded-2xl border border-border bg-card p-[22px]">
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
            360° / walkaround video
          </h2>
          <video
            controls
            playsInline
            preload="metadata"
            src={listing.videoUrl}
            className="max-h-[460px] w-full rounded-xl border border-border bg-black"
          />
        </section>
      )}

      <section className="mb-4 rounded-2xl border border-border bg-card p-[22px]">
        <h2 className="mb-2.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          Condition notes
        </h2>
        <p className="mb-3.5 text-sm leading-[1.6] text-text">{listing.conditionNotes}</p>
        <p className="text-[13px] text-muted">
          Inspection report: {listing.inspectionNotes ?? "Not yet requested by buyer."}
        </p>
      </section>

      {listing.auctionSheetUrl && (
        <a
          href={listing.auctionSheetUrl}
          target="_blank"
          rel="noreferrer"
          className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-[18px] transition hover:border-accent"
        >
          <div>
            <p className="text-sm font-bold text-text">Auction sheet</p>
            <p className="text-[12px] text-dim">
              The car&apos;s original inspection grade sheet, verified by AutoBD.
            </p>
          </div>
          <span className="whitespace-nowrap text-[13px] font-bold text-accent">View &#8599;</span>
        </a>
      )}

      <section className="mb-4 rounded-2xl border border-border bg-card p-[22px]">
        <h2 className="mb-2.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          BRTA registration paper value
        </h2>
        <p className="mb-2.5 text-sm text-text">{paper.label}</p>
        <div className="h-2 overflow-hidden rounded-[4px] bg-track">
          <div
            className="h-full rounded-[4px] bg-accent"
            style={{ width: `${paper.pct}%` }}
          />
        </div>
        <p className="mt-2.5 text-xs text-dim">
          {listing.manufactureYear} model &middot; based on the current {maxAge}-year import
          age limit. Simplified estimate — NBR age rules change with each national budget.
        </p>
      </section>

      {buyer && !isOwnListing && !isSold && (
        <section className="mb-4 rounded-2xl border border-border bg-card p-[22px]">
          <p className="mb-2.5 text-[13px] text-muted">
            Buy now at the asking price and pay it with the rest of your cart, or make an offer below.
          </p>
          <AddToCartButton
            kind={CartItemKind.USED_CAR}
            refId={listing.id}
            label={`Add to cart · ${bdtLakh(listing.priceBdt)}`}
            className="rounded-[10px] bg-accent px-5 py-3 text-sm font-bold text-on-accent transition hover:bg-accent-hover disabled:opacity-60"
          />
        </section>
      )}

      <OfferForm
        listingId={listing.id}
        canOffer={Boolean(buyer) && !isOwnListing && !isSold}
        blockedReason={blockedReason}
        existingOffer={myOffer ? bdt(myOffer.amountBdt) : undefined}
      />
    </main>
  );
}
