"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentBuyer } from "@/lib/session";

export type TestDriveResult = { error?: string; ok?: boolean; scheduledLabel?: string };

/**
 * Reserves a real test drive: buyer + car + a required dealer branch + a
 * date/time. The dealer must belong to the car's brand, and the slot must be
 * in the future. Buyer-only.
 */
export async function reserveTestDrive(
  _prev: TestDriveResult,
  formData: FormData,
): Promise<TestDriveResult> {
  const buyer = await currentBuyer();
  if (!buyer) return { error: "Only buyer accounts can reserve a test drive." };

  const newCarId = String(formData.get("newCarId") ?? "");
  const dealerId = String(formData.get("dealerId") ?? "");
  const when = String(formData.get("scheduledAt") ?? "");

  if (!dealerId) return { error: "Pick a dealer location for the test drive." };
  if (!when) return { error: "Pick a date and time." };

  const scheduledAt = new Date(when);
  if (Number.isNaN(scheduledAt.getTime())) return { error: "That date/time isn't valid." };
  if (scheduledAt.getTime() < Date.now() + 60 * 60 * 1000) {
    return { error: "Choose a time at least an hour from now." };
  }

  const [car, dealer] = await Promise.all([
    prisma.newCar.findUnique({ where: { id: newCarId } }),
    prisma.dealer.findUnique({ where: { id: dealerId } }),
  ]);
  if (!car) return { error: "That car is no longer listed." };
  if (!dealer || dealer.brandId !== car.brandId) {
    return { error: "That dealer isn't valid for this brand." };
  }

  try {
    await prisma.testDriveReservation.create({
      data: { buyerId: buyer.id, newCarId, dealerId, scheduledAt },
    });
  } catch {
    // Unique [buyer, car, dealer, slot] — an identical reservation already exists.
    return { error: "You already reserved that exact slot." };
  }

  revalidatePath("/new-cars", "layout");
  return {
    ok: true,
    scheduledLabel: scheduledAt.toLocaleString("en-GB", {
      timeZone: "Asia/Dhaka",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}
