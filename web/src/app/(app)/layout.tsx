import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { RouteTransition } from "@/components/RouteTransition";
import { getCartCount } from "@/lib/cart";
import { Role } from "@/generated/prisma/enums";

// Route protection lives here rather than in a proxy: Next 16's proxy
// convention is documented as CDN-deployable and must not rely on shared
// modules, which rules out Prisma-backed session checks.
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Organizations get a different shell, labelled with their company name.
  const org =
    session.user.role === Role.ORGANIZATION && session.user.id
      ? await prisma.organization.findUnique({
          where: { userId: session.user.id },
          select: { companyName: true },
        })
      : null;

  // Buyers get a cart badge in the header.
  let cartCount = 0;
  if (session.user.role === Role.BUYER && session.user.id) {
    const buyer = await prisma.buyer.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (buyer) cartCount = await getCartCount(buyer.id);
  }

  return (
    <>
      <AppHeader
        email={session.user.email}
        role={session.user.role}
        orgName={org?.companyName}
        cartCount={cartCount}
      />
      <RouteTransition>{children}</RouteTransition>
    </>
  );
}
