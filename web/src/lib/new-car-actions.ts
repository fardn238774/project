"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentBuyer } from "@/lib/session";

export type InquiryResult = { error?: string; ok?: boolean };

/**
 * Records a real DealerInquiry for the signed-in buyer, optionally tied to the
 * branch they picked (mirroring test-drive locations).
 */
export async function submitInquiry(
  _prev: InquiryResult,
  formData: FormData,
): Promise<InquiryResult> {
  const buyer = await currentBuyer();
  if (!buyer) return { error: "Only buyer accounts can send dealer inquiries." };

  const variantId = String(formData.get("variantId") ?? "");
  const dealerIdRaw = String(formData.get("dealerId") ?? "").trim();

  const variant = await prisma.newCarVariant.findUnique({
    where: { id: variantId },
    include: { newCar: { select: { brandId: true } } },
  });
  if (!variant) return { error: "That variant is no longer listed." };

  // If a dealer was chosen, it must belong to this car's brand.
  let dealerId: string | null = null;
  if (dealerIdRaw) {
    const dealer = await prisma.dealer.findUnique({ where: { id: dealerIdRaw } });
    if (!dealer || dealer.brandId !== variant.newCar.brandId) {
      return { error: "That dealer isn't valid for this brand." };
    }
    dealerId = dealer.id;
  }

  const existing = await prisma.dealerInquiry.findFirst({
    where: { buyerId: buyer.id, variantId, status: { not: "CLOSED" } },
  });
  if (existing) return { error: "You already have an open inquiry for this variant." };

  await prisma.dealerInquiry.create({ data: { buyerId: buyer.id, variantId, dealerId } });
  revalidatePath("/new-cars", "layout");
  return { ok: true };
}
