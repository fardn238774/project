import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentBuyer } from "@/lib/session";
import { bdtLakh, num } from "@/lib/format";
import { NewCarDetail } from "./NewCarDetail";

export default async function NewCarDetailPage({
  params,
}: {
  params: Promise<{ brand: string; car: string }>;
}) {
  const { brand, car: carId } = await params;

  const car = await prisma.newCar.findUnique({
    where: { id: carId },
    include: {
      brand: { include: { dealers: { orderBy: { name: "asc" } } } },
      variants: { orderBy: { priceBdt: "asc" } },
    },
  });
  // Guard the nested URL: the car must actually belong to this brand slug.
  if (!car || car.brand.slug !== brand) notFound();

  const buyer = await currentBuyer();

  const [openInquiries, myTestDrives] = buyer
    ? await Promise.all([
        prisma.dealerInquiry.findMany({
          where: {
            buyerId: buyer.id,
            status: { not: "CLOSED" },
            variantId: { in: car.variants.map((v) => v.id) },
          },
          select: { variantId: true },
        }),
        prisma.testDriveReservation.findMany({
          where: { buyerId: buyer.id, newCarId: car.id, scheduledAt: { gte: new Date() } },
          include: { dealer: { select: { name: true } } },
          orderBy: { scheduledAt: "asc" },
        }),
      ])
    : [[], []];

  return (
    <main className="mx-auto w-full max-w-[900px] px-10 pb-20 pt-6">
      <Link
        href={`/new-cars/${car.brand.slug}`}
        className="mb-4.5 block text-[13px] text-muted hover:text-text"
      >
        {`← Back to ${car.brand.name}`}
      </Link>
      <p className="text-xs font-bold uppercase tracking-[0.03em] text-dim">{car.brand.name}</p>
      <h1 className="mb-5 text-[30px] font-extrabold text-text">{car.model}</h1>

      <NewCarDetail
        newCarId={car.id}
        brandName={car.brand.name}
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
        dealers={car.brand.dealers.map((d) => ({
          id: d.id,
          name: d.name,
          address: d.address,
          latitude: num(d.latitude),
          longitude: num(d.longitude),
        }))}
        inquiredVariantIds={openInquiries.map((i) => i.variantId)}
        upcomingTestDrives={myTestDrives.map((t) => ({
          id: t.id,
          dealerName: t.dealer.name,
          scheduledLabel: t.scheduledAt.toLocaleString("en-GB", {
            timeZone: "Asia/Dhaka",
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
        }))}
      />
    </main>
  );
}
