"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentBuyer } from "@/lib/session";

export type InquiryResult = { error?: string; ok?: boolean };

/** Records a real DealerInquiry row for the signed-in buyer. */
export async function submitInquiry(
  _prev: InquiryResult,
  formData: FormData,
): Promise<InquiryResult> {
  const buyer = await currentBuyer();
  if (!buyer) return { error: "Only buyer accounts can send dealer inquiries." };

  const variantId = String(formData.get("variantId") ?? "");
  const variant = await prisma.newCarVariant.findUnique({ where: { id: variantId } });
  if (!variant) return { error: "That variant is no longer listed." };

  const existing = await prisma.dealerInquiry.findFirst({
    where: { buyerId: buyer.id, variantId, status: { not: "CLOSED" } },
  });
  if (existing) return { error: "You already have an open inquiry for this variant." };

  await prisma.dealerInquiry.create({ data: { buyerId: buyer.id, variantId } });
  revalidatePath(`/new-cars/${variant.newCarId}`);
  return { ok: true };
}
