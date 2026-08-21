import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { num } from "@/lib/format";
import { OrgManager, type Org } from "./OrgManager";
import { AuctionManager, type Auction } from "./AuctionManager";

export const metadata = { title: "Reconditioned Import — System Management" };

function utcLabel(d: Date) {
  return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

export default async function ReconditionedManagementPage() {
  await requireAdmin();

  const [orgs, auctions] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { companyName: "asc" },
      include: { user: { select: { email: true } } },
    }),
    prisma.auction.findMany({
      orderBy: { startsAt: "asc" },
      include: { broadcast: true, lots: { orderBy: { lotNumber: "asc" } } },
    }),
  ]);

  const orgData: Org[] = orgs.map((o) => ({
    id: o.id,
    companyName: o.companyName,
    licenseNumber: o.licenseNumber,
    yearsInOperation: o.yearsInOperation,
    about: o.about,
    feeType: o.feeType,
    feeValue: num(o.feeValue),
    successfulImports: o.successfulImports,
    avgTurnaroundDays: o.avgTurnaroundDays,
    status: o.status,
    logoUrl: o.logoUrl,
    email: o.user.email,
  }));

  const auctionData: Auction[] = auctions.map((a) => ({
    id: a.id,
    house: a.house,
    location: a.location,
    startsAtValue: a.startsAt.toISOString().slice(0, 16),
    startsAtLabel: utcLabel(a.startsAt),
    status: a.status,
    broadcastUrl: a.broadcast?.url ?? null,
    broadcastKind: a.broadcast?.kind ?? "VIDEO",
    lots: a.lots.map((l) => ({
      id: l.id,
      lotNumber: l.lotNumber,
      make: l.make,
      model: l.model,
      manufactureYear: l.manufactureYear,
      mileageKm: l.mileageKm,
      engineCc: l.engineCc,
      grade: l.grade,
      chassisCode: l.chassisCode,
      startingPriceJpy: num(l.startingPriceJpy),
      reservePriceJpy: l.reservePriceJpy ? num(l.reservePriceJpy) : null,
      durationSeconds: l.durationSeconds,
      status: l.status,
      photoUrls: l.photoUrls,
      videoUrls: l.videoUrls,
    })),
  }));

  return (
    <main className="mx-auto w-full max-w-[1080px] px-10 pb-24 pt-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold text-text">Reconditioned Import</h1>
          <p className="mt-1 text-[14px] text-muted">
            Manage bidding organizations, auction sessions, and the cars inside them — with photos and
            videos on every lot.
          </p>
        </div>
        <Link href="/admin/system" className="text-[13px] text-muted hover:text-accent">
          &larr; System Management
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          Bidding organizations
        </h2>
        <OrgManager orgs={orgData} />
      </section>

      <section>
        <h2 className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          Auctions &amp; car lots
        </h2>
        <AuctionManager auctions={auctionData} />
      </section>
    </main>
  );
}
