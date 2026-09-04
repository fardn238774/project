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
import { OfferActions, MarkSoldButton } from "./SellerControls";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ListingChatPanel } from "@/components/ListingChatPanel";
import type { ChatMessage } from "@/lib/chat";
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

  // The owner sees received offers + every buyer's chat thread; a buyer sees
  // only their own thread with the seller.
  type ChatThread = { id: string; buyerName: string; messages: ChatMessage[] };
  let offers: { id: string; amount: string; buyerName: string; status: OfferStatus }[] = [];
  let sellerThreads: ChatThread[] = [];
  let myThreadId: string | null = null;
  let myMessages: ChatMessage[] = [];

  if (isOwnListing && isPublic) {
    const [offerRows, threadRows] = await Promise.all([
      prisma.offer.findMany({
        where: { listingId: id },
        orderBy: { createdAt: "desc" },
        include: { buyer: { select: { fullName: true } } },
      }),
      prisma.listingThread.findMany({
        where: { listingId: id },
        orderBy: { createdAt: "asc" },
        include: {
          buyer: { select: { fullName: true } },
          messages: {
            orderBy: { createdAt: "asc" },
            take: 200,
            include: { senderBuyer: { select: { fullName: true } } },
          },
        },
      }),
    ]);
    offers = offerRows.map((o) => ({
      id: o.id,
      amount: bdt(o.amountBdt),
      buyerName: o.buyer.fullName,
      status: o.status,
    }));
    sellerThreads = threadRows.map((t) => ({
      id: t.id,
      buyerName: t.buyer.fullName,
      messages: t.messages.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        mine: m.senderBuyerId === buyer?.id,
        senderLabel: m.senderBuyer.fullName,
      })),
    }));
  } else if (buyer && !isOwnListing && !isSold) {
    const t = await prisma.listingThread.findUnique({
      where: { listingId_buyerId: { listingId: id, buyerId: buyer.id } },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 200,
          include: { senderBuyer: { select: { fullName: true } } },
        },
      },
    });
    if (t) {
      myThreadId = t.id;
      myMessages = t.messages.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        mine: m.senderBuyerId === buyer.id,
        senderLabel: m.senderBuyer.fullName,
      }));
    }
  }

  return (
    <main className="mx-auto w-full max-w-[900px] px-5 sm:px-8 lg:px-10 pb-25 pt-6">
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

      {isOwnListing ? (
        isPublic && (
          <>
            <section className="mb-4 rounded-2xl border border-border bg-card p-[22px]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
                  Your listing — offers &amp; messages
                </h2>
                {isSold ? (
                  <Pill tone="good" size="md">
                    Sold
                  </Pill>
                ) : (
                  <MarkSoldButton listingId={listing.id} />
                )}
              </div>

              <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.03em] text-muted">
                Offers received ({offers.length})
              </p>
              {offers.length === 0 ? (
                <p className="text-[13px] text-dim">No offers yet. Buyers can offer or message you below.</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border">
                  {offers.map((o, i) => (
                    <div
                      key={o.id}
                      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
                        i > 0 ? "border-t border-track" : ""
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold text-text">{o.amount}</p>
                        <p className="text-[12px] text-dim">from {o.buyerName}</p>
                      </div>
                      {o.status === OfferStatus.PENDING && !isSold ? (
                        <OfferActions offerId={o.id} />
                      ) : (
                        <span className="rounded-md bg-chip px-2.5 py-1 text-[11px] font-bold text-dim">
                          {o.status === OfferStatus.ACCEPTED
                            ? "Accepted"
                            : o.status === OfferStatus.REJECTED
                              ? "Declined"
                              : "Pending"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {sellerThreads.length > 0 && (
              <section className="mb-4">
                <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.03em] text-muted">
                  Buyer messages ({sellerThreads.length})
                </p>
                <div className="grid gap-3">
                  {sellerThreads.map((t) => (
                    <ListingChatPanel
                      key={t.id}
                      mode="seller"
                      listingId={listing.id}
                      threadId={t.id}
                      initialMessages={t.messages}
                      title={`Chat with ${t.buyerName}`}
                      emptyHint="No messages yet."
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )
      ) : (
        <>
          {buyer && !isSold && (
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
            canOffer={Boolean(buyer) && !isSold}
            blockedReason={blockedReason}
            existingOffer={myOffer ? bdt(myOffer.amountBdt) : undefined}
          />

          {buyer && !isSold && (
            <div className="mt-4">
              <ListingChatPanel
                mode="buyer"
                listingId={listing.id}
                threadId={myThreadId}
                initialMessages={myMessages}
                title={`Chat with ${listing.seller.fullName} (seller)`}
                emptyHint={`Ask ${listing.seller.fullName} anything about this car — replies appear here.`}
              />
            </div>
          )}
        </>
      )}
    </main>
  );
}
