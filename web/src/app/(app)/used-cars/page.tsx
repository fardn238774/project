import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { bdtLakh, km } from "@/lib/format";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { Pill, verifiedPill, accidentPill } from "@/components/StatusChip";
import { ListingStatus, type Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Used Cars — AutoBD" };

/**
 * The prototype draws these four chips but wires nothing to them. They are
 * implemented here as real sort orders — the least invented reading of the
 * labels that keeps the visual identical.
 */
const SORTS = {
  all: { label: "All", orderBy: { createdAt: "desc" } },
  make: { label: "By make/model", orderBy: [{ make: "asc" }, { model: "asc" }] },
  price: { label: "By price", orderBy: { priceBdt: "asc" } },
  location: { label: "By location", orderBy: { location: "asc" } },
} satisfies Record<
  string,
  { label: string; orderBy: Prisma.UsedCarListingOrderByWithRelationInput | Prisma.UsedCarListingOrderByWithRelationInput[] }
>;

type SortKey = keyof typeof SORTS;

export default async function UsedCarsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const active: SortKey = sort && sort in SORTS ? (sort as SortKey) : "all";

  // Only admin-approved listings appear on the marketplace. A seller's fresh
  // submission sits in PENDING_VERIFICATION (and a rejected one in REJECTED)
  // until an admin reviews it — those stay on the seller's own dashboard, not
  // here. Sold cars also drop off the marketplace but remain on the dashboard.
  const listings = await prisma.usedCarListing.findMany({
    where: { status: { in: [ListingStatus.ACTIVE, ListingStatus.OFFER_RECEIVED] } },
    orderBy: SORTS[active].orderBy,
  });

  return (
    <main className="mx-auto w-full max-w-[1180px] px-10 pb-20 pt-6">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-2 text-[30px] font-extrabold tracking-[-0.01em] text-text">
            Used car marketplace
          </h1>
          <p className="max-w-[560px] text-[15px] text-muted">
            Peer-to-peer listings, each reviewed and approved by our admin team — with
            registration details and an auction sheet on file — before going live.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/used-cars/seller"
            className="whitespace-nowrap text-[13px] font-bold text-accent"
          >
            My seller dashboard &rarr;
          </Link>
          <Link
            href="/used-cars/seller/new"
            className="whitespace-nowrap rounded-[10px] bg-accent px-4 py-2.5 text-[13px] font-bold text-on-accent transition hover:bg-accent-hover"
          >
            List your car
          </Link>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {(Object.keys(SORTS) as SortKey[]).map((key) => {
          const on = key === active;
          return (
            <Link
              key={key}
              href={key === "all" ? "/used-cars" : `/used-cars?sort=${key}`}
              className={`rounded-[20px] px-3.5 py-2 text-[13px] ${
                on
                  ? "bg-ink font-semibold text-white"
                  : "border border-border bg-card text-muted hover:text-text"
              }`}
            >
              {SORTS[key].label}
            </Link>
          );
        })}
      </div>

      {listings.length === 0 ? (
        <p className="text-[14px] text-muted">No listings on the marketplace yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((c) => {
            const v = verifiedPill(c.ownershipVerified);
            const a = accidentPill(c.accidentStatus);
            return (
              <Link
                key={c.id}
                href={`/used-cars/${c.id}`}
                className="overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-[0_6px_18px_rgba(0,0,0,0.06)]"
              >
                {c.photoUrls.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.photoUrls[0]}
                    alt={c.title}
                    className="h-[110px] w-full object-cover"
                  />
                ) : (
                  <PhotoPlaceholder label="listing photo" height={110} radius={0} />
                )}
                <div className="p-4">
                  <p className="mb-1 text-[15px] font-bold text-text">{c.title}</p>
                  <p className="mb-2.5 text-[13px] text-muted">
                    {km(c.mileageKm)} km &middot; {c.location}
                  </p>
                  <p className="mb-2.5 text-base font-extrabold text-accent">
                    {bdtLakh(c.priceBdt)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Pill tone={v.tone}>{v.label}</Pill>
                    <Pill tone={a.tone}>{a.label}</Pill>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
