import { prisma } from "@/lib/prisma";
import { currentBuyer } from "@/lib/session";
import { readCatalog, readGarage } from "@/lib/fitment";
import { ModStudio } from "./ModStudio";

export const metadata = { title: "Modification Studio — AutoBD" };

export default async function ModificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ lot?: string }>;
}) {
  const [{ lot: lotId }, buyer] = await Promise.all([searchParams, currentBuyer()]);

  // Arriving from a delivered shipment preselects that car.
  const fromLot = lotId
    ? await prisma.auctionCar.findUnique({
        where: { id: lotId },
        select: { chassisCode: true },
      })
    : null;

  const [parts, garage] = await Promise.all([
    readCatalog(fromLot?.chassisCode ?? null),
    buyer ? readGarage(buyer.id) : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-10 pb-20 pt-6">
      <h1 className="mb-2 text-[30px] font-extrabold tracking-[-0.01em] text-text">
        Modification Studio
      </h1>
      <p className="mb-6 max-w-[680px] text-[15px] text-muted">
        BRTA-legal wheels, body kits, lighting and interior parts — filtered to what actually
        fits your car by chassis code, bolt pattern and offset. Then see it in 3D.
      </p>

      <ModStudio
        parts={parts}
        garage={garage}
        initialChassis={fromLot?.chassisCode ?? null}
      />
    </main>
  );
}
