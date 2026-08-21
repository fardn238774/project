import { prisma } from "@/lib/prisma";
import { num } from "@/lib/format";
import { LotStatus } from "@/generated/prisma/enums";
import type { CatalogPart, GarageCar } from "@/lib/parts";

/**
 * Server-side fitment queries. Types and labels live in lib/parts.ts so client
 * components can import them without pulling prisma into the browser bundle.
 */

/**
 * The FR's fitment checker: compatibility is decided by chassis code, which is
 * what actually determines whether a part bolts on. With no car selected every
 * part is listed as-is; with one, each part is marked compatible or not so the
 * buyer can still see what exists but cannot order the wrong thing.
 */
export async function readCatalog(chassisCode: string | null): Promise<CatalogPart[]> {
  const parts = await prisma.part.findMany({
    orderBy: [{ category: "asc" }, { priceBdt: "asc" }],
    include: { fitments: true },
  });

  return parts.map((p) => {
    const fits = p.fitments.map((f) => f.chassisCode);
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      priceBdt: num(p.priceBdt),
      brtaLegal: p.brtaLegal,
      boltPattern: p.boltPattern,
      offsetMm: p.offsetMm,
      photoUrls: p.photoUrls,
      videoUrls: p.videoUrls,
      fits,
      compatible: chassisCode === null ? true : fits.includes(chassisCode),
    };
  });
}

/** Cars this buyer actually won — the FR's "select from their garage". */
export async function readGarage(buyerId: string): Promise<GarageCar[]> {
  const won = await prisma.auctionCar.findMany({
    where: { status: LotStatus.SOLD, winningBid: { bidderId: buyerId } },
    orderBy: { createdAt: "desc" },
  });

  return won.map((c) => ({
    id: c.id,
    label: `${c.manufactureYear} ${c.make} ${c.model}${c.chassisCode ? ` · ${c.chassisCode}` : ""}`,
    chassisCode: c.chassisCode,
  }));
}

/** Every chassis code the catalog knows, for the manual-entry picker. */
export async function knownChassisCodes(): Promise<string[]> {
  const rows = await prisma.partFitment.findMany({
    distinct: ["chassisCode"],
    select: { chassisCode: true },
    orderBy: { chassisCode: "asc" },
  });
  return rows.map((r) => r.chassisCode);
}
