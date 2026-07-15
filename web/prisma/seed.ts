import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Simplified NBR duty bands by engine CC. Surfaced in the UI as a
// "simplified estimate" — real rates vary by vehicle type and change with
// annual budget notifications. Admin-editable at runtime.
const DUTY_BANDS = [
  { ccMin: 0, ccMax: 1500, ratePercent: 89 },
  { ccMin: 1501, ccMax: 2000, ratePercent: 110 },
  { ccMin: 2001, ccMax: 3000, ratePercent: 150 },
  { ccMin: 3001, ccMax: null, ratePercent: 200 },
];

const SETTINGS: Record<string, string> = {
  shippingFlatBdt: "195000",
  portHandlingBdt: "42000",
  antiSnipeWindowSeconds: "30",
  antiSnipeExtendSeconds: "60",
  antiSnipeWarnAfterExtensions: "20",
  containerCapacity: "10",
  poolingDiscountPercent: "30",
  importEligibilityMaxAgeYears: "5",
  minBidIncrementJpy: "5000",
  exchangeRateTtlMinutes: "60",
};

async function main() {
  // Duty bands are replaced wholesale rather than upserted: ccMax is nullable
  // for the open-ended top band, and Postgres treats NULLs as distinct in a
  // unique index, so an upsert key can't address that row reliably.
  await prisma.dutyRate.deleteMany();
  await prisma.dutyRate.createMany({ data: DUTY_BANDS });

  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.platformSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  const bands = await prisma.dutyRate.count();
  const settings = await prisma.platformSetting.count();
  console.log(`seeded: ${bands} duty bands, ${settings} platform settings`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
