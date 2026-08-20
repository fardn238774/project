import { prisma } from "@/lib/prisma";
import { ListingStatus, type Prisma } from "@/generated/prisma/client";

/**
 * Public REST endpoint — list the approved used-car marketplace listings as JSON.
 *
 * No login required: this returns the same public data the marketplace shows, so
 * it is easy to test in Postman (just send a GET to the URL).
 *
 * Optional query parameters:
 *   ?make=Toyota   filter by make   (case-insensitive, partial match)
 *   ?city=Dhaka    filter by city   (case-insensitive, partial match)
 *   ?limit=20      max rows to return (1–100, default 50)
 *
 * Example:  GET http://localhost:3000/api/used-cars?make=Toyota
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const make = searchParams.get("make")?.trim();
  const city = searchParams.get("city")?.trim();
  const limitRaw = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;

  // Only admin-approved listings are public (same rule as the marketplace page).
  const where: Prisma.UsedCarListingWhereInput = {
    status: { in: [ListingStatus.ACTIVE, ListingStatus.OFFER_RECEIVED] },
  };
  if (make) where.make = { contains: make, mode: "insensitive" };
  if (city) where.location = { contains: city, mode: "insensitive" };

  const listings = await prisma.usedCarListing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Map to a clean JSON shape (turn Decimal price into a number, etc.).
  const cars = listings.map((c) => ({
    id: c.id,
    title: c.title,
    make: c.make,
    model: c.model,
    year: c.manufactureYear,
    mileageKm: c.mileageKm,
    priceBdt: Number(c.priceBdt),
    location: c.location,
    transmission: c.transmission,
    fuelType: c.fuelType,
    ownershipVerified: c.ownershipVerified,
    photoCount: c.photoUrls.length,
    listedAt: c.createdAt,
  }));

  return Response.json(
    { count: cars.length, cars },
    { headers: { "Cache-Control": "no-store" } },
  );
}
