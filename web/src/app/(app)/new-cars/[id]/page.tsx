import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentBuyer } from "@/lib/session";
import { bdtLakh, num } from "@/lib/format";
import { NewCarDetail } from "./NewCarDetail";

export default async function NewCarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const car = await prisma.newCar.findUnique({
    where: { id },
    include: { variants: { orderBy: { priceBdt: "asc" } } },
  });
  if (!car) notFound();

  const buyer = await currentBuyer();

  // Which variants this buyer already has an open inquiry on — drives the
  // "inquiry sent" confirmation the prototype shows after submitting.
  const openInquiries = buyer
    ? await prisma.dealerInquiry.findMany({
        where: {
          buyerId: buyer.id,
          status: { not: "CLOSED" },
          variantId: { in: car.variants.map((v) => v.id) },
        },
        select: { variantId: true },
      })
    : [];

  return (
    <main className="mx-auto w-full max-w-[900px] px-10 pb-20 pt-6">
      <Link href="/new-cars" className="mb-4.5 block text-[13px] text-muted hover:text-text">
        &larr; Back to new cars
      </Link>
      <p className="text-xs font-bold uppercase tracking-[0.03em] text-dim">{car.brand}</p>
      <h1 className="mb-5 text-[30px] font-extrabold text-text">{car.model}</h1>

      <NewCarDetail
        brand={car.brand}
        warranty={`${car.warrantyYears}-year`}
        warrantyKm={`${new Intl.NumberFormat("en-US").format(car.warrantyKm)} km`}
        isBuyer={Boolean(buyer)}
        variants={car.variants.map((v) => ({
          id: v.id,
          name: v.name,
          price: bdtLakh(v.priceBdt),
          engine: v.engine,
          trans: v.transmission,
          economy: `${num(v.economyKmPerL)} km/l`,
        }))}
        inquiredVariantIds={openInquiries.map((i) => i.variantId)}
      />
    </main>
  );
}
