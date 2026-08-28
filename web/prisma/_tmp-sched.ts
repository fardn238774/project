import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const now = new Date();
  if (process.argv[2] === "reset") {
    const r = await prisma.auctionCar.updateMany({
      where: { startedAt: { gt: now } },
      data: { status: "PENDING", startedAt: null, endsAt: null },
    });
    console.log("reset scheduled lots:", r.count);
    return;
  }

  // Did the admin scheduleLot click land? (lots with a future startedAt)
  const scheduled = await prisma.auctionCar.findMany({
    where: { startedAt: { gt: now } },
    select: { id: true, startedAt: true, status: true, auctionId: true, make: true, model: true },
  });
  console.log(
    "Future-scheduled lots:",
    scheduled.length,
    scheduled.map((s) => ({
      lot: s.id.slice(-6),
      startsInSec: Math.round((s.startedAt!.getTime() - now.getTime()) / 1000),
      status: s.status,
    })),
  );

  let target = scheduled[0] as { id: string; auctionId: string } | undefined;
  if (!target) {
    const lot = await prisma.auctionCar.findFirst({ where: { status: { not: "SOLD" } } });
    if (!lot) return console.log("no lot to schedule");
    const startedAt = new Date(now.getTime() + 90 * 1000);
    await prisma.auctionCar.update({
      where: { id: lot.id },
      data: {
        status: "LIVE",
        startedAt,
        endsAt: new Date(startedAt.getTime() + 90 * 1000),
        durationSeconds: 90,
        extensionCount: 0,
        winningBidId: null,
      },
    });
    await prisma.auction.update({ where: { id: lot.auctionId }, data: { status: "LIVE" } });
    console.log("Seeded a scheduled lot (starts in 90s):", lot.id.slice(-6));
    target = { id: lot.id, auctionId: lot.auctionId };
  }

  const org = await prisma.organization.findFirst({
    where: { status: "APPROVED" },
    select: { id: true },
  });
  if (org && target) {
    console.log(`BIDDING_URL=/auctions/agents/${org.id}/sessions/${target.auctionId}/lots/${target.id}`);
  }
}
main().finally(() => prisma.$disconnect());
