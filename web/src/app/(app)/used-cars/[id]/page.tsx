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
import { ListingStatus, OfferStatus } from "@/generated/prisma/client";

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

  const myOffer = buyer
    ? await prisma.offer.findFirst({
        where: { listingId: id, buyerId: buyer.id, status: OfferStatus.PENDING },
      })
    : null;

  const v = verifiedPill(listing.ownershipVerified);
  const a = accidentPill(listing.accidentStatus);
  const paper = brtaPaperValue(listing.manufactureYear, maxAge);

  const isOwnListing = buyer?.id === listing.sellerId;
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

      <PhotoPlaceholder label="listing photos — 6" height={220} radius={14} className="mb-4.5" />

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
        <h2 className="mb-2.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          Condition notes
        </h2>
        <p className="mb-3.5 text-sm leading-[1.6] text-text">{listing.conditionNotes}</p>
        <p className="text-[13px] text-muted">
          Inspection report: {listing.inspectionNotes ?? "Not yet requested by buyer."}
        </p>
      </section>

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

      <OfferForm
        listingId={listing.id}
        canOffer={Boolean(buyer) && !isOwnListing && !isSold}
        blockedReason={blockedReason}
        existingOffer={myOffer ? bdt(myOffer.amountBdt) : undefined}
      />
    </main>
  );
}
