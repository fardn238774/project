import { prisma } from "@/lib/prisma";
import { CartItemStatus } from "@/generated/prisma/enums";

/** All items currently in a buyer's cart (unpaid), newest first. */
export function getCartItems(buyerId: string) {
  return prisma.cartItem.findMany({
    where: { buyerId, status: CartItemStatus.IN_CART },
    orderBy: { createdAt: "desc" },
  });
}

/** Count for the header badge. */
export function getCartCount(buyerId: string) {
  return prisma.cartItem.count({ where: { buyerId, status: CartItemStatus.IN_CART } });
}
