// Small helper to put a few demo rows in the Payment table so the Payments
// API endpoints (/api/payments, /api/payments/[id]) return real data for the
// API/Postman assignment. Safe to re-run: it does nothing if payments exist.
//
//   Run from web/:  npx tsx prisma/seed-demo-payments.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.payment.count();
  if (existing > 0) {
    console.log(`Payments already exist (${existing}) — nothing to seed.`);
    return;
  }

  const buyer = await prisma.buyer.findFirst();
  if (!buyer) {
    console.error("No buyer found. Seed the app first: npx prisma db seed");
    return;
  }
  const lot = await prisma.auctionCar.findFirst();
  const listing = await prisma.usedCarListing.findFirst();

  await prisma.payment.createMany({
    data: [
      { payerId: buyer.id, purpose: "AUCTION_WIN", gateway: "SSLCOMMERZ", amountBdt: 4200000, status: "HELD_IN_ESCROW", auctionCarId: lot?.id ?? null, gatewayRef: "DEMO-SSL-1001" },
      { payerId: buyer.id, purpose: "USED_CAR", gateway: "SSLCOMMERZ", amountBdt: 1850000, status: "RELEASED", usedCarListingId: listing?.id ?? null, gatewayRef: "DEMO-SSL-1002" },
      { payerId: buyer.id, purpose: "MODIFICATION", gateway: "BKASH", amountBdt: 65000, status: "PENDING", gatewayRef: "DEMO-BKASH-2001" },
      { payerId: buyer.id, purpose: "NEW_CAR", gateway: "BKASH", amountBdt: 5200000, status: "FAILED", gatewayRef: "DEMO-BKASH-2002" },
    ],
  });

  const total = await prisma.payment.count();
  console.log(`Seeded demo payments. Total now: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
