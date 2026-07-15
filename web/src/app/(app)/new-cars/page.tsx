import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { bdtLakhRange } from "@/lib/format";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";

export const metadata = { title: "New Cars — AutoBD" };

export default async function NewCarsPage() {
  const cars = await prisma.newCar.findMany({
    orderBy: [{ brand: "asc" }, { model: "asc" }],
  });

  return (
    <main className="mx-auto w-full max-w-[1180px] px-10 pb-20 pt-6">
      <h1 className="mb-2 text-[30px] font-extrabold tracking-[-0.01em] text-text">
        Brand new car listings
      </h1>
      <p className="mb-7 max-w-[640px] text-[15px] text-muted">
        Browse official dealership inventory by manufacturer. AutoBD is a lead &amp;
        booking layer — dealer partners fulfil every order.
      </p>

      {cars.length === 0 ? (
        <p className="text-[14px] text-muted">No dealer inventory published yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cars.map((car) => (
            <Link
              key={car.id}
              href={`/new-cars/${car.id}`}
              className="rounded-2xl border border-border bg-card p-5 transition hover:shadow-[0_6px_18px_rgba(0,0,0,0.06)]"
            >
              <PhotoPlaceholder label="product photo" height={120} className="mb-3.5" />
              <p className="text-xs font-bold uppercase tracking-[0.03em] text-dim">
                {car.brand}
              </p>
              <p className="mb-1.5 text-[17px] font-bold text-text">{car.model}</p>
              <p className="mb-2.5 text-sm text-muted">
                {bdtLakhRange(car.priceMinBdt, car.priceMaxBdt)} &middot; {car.warrantyYears}
                -year warranty
              </p>
              <p className="text-[13px] font-bold text-accent">View variants &amp; specs &rarr;</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
