import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
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

  return (
    <>
      <AppHeader
        email={session.user.email}
        role={session.user.role}
        orgName={org?.companyName}
      />
      {children}
    </>
  );
}
