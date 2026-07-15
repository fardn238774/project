import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/AppHeader";

// Route protection lives here rather than in a proxy: Next 16's proxy
// convention is documented as CDN-deployable and must not rely on shared
// modules, which rules out Prisma-backed session checks.
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      <AppHeader email={session.user.email} role={session.user.role} />
      {children}
    </>
  );
}
