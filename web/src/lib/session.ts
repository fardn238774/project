import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

/** Session user, or a redirect to /login. Use in server components/actions. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

/**
 * The Buyer profile for the signed-in user. Buyer-only screens (offers, bids,
 * wishlist) need this; admins and organizations have no Buyer row, so they are
 * sent home rather than shown a broken screen.
 */
export async function requireBuyer() {
  const user = await requireUser();
  const buyer = await prisma.buyer.findUnique({ where: { userId: user.id } });
  if (!buyer) redirect("/");
  return buyer;
}

/** As requireBuyer, but returns null instead of redirecting. */
export async function currentBuyer() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.buyer.findUnique({ where: { userId: session.user.id } });
}

export async function requireOrganization() {
  const user = await requireUser();
  const org = await prisma.organization.findUnique({ where: { userId: user.id } });
  if (!org) redirect("/");
  return org;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) redirect("/");
  const admin = await prisma.admin.findUnique({ where: { userId: user.id } });
  if (!admin) redirect("/");
  return admin;
}
