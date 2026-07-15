import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logout } from "@/lib/auth-actions";
import { prisma } from "@/lib/prisma";

// TEMPORARY: proves the auth/session/role wiring end to end. Replaced by the
// real app shell and home screen in the next step of the port.
export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id, email, role } = session.user;

  const org =
    role === "ORGANIZATION"
      ? await prisma.organization.findFirst({
          where: { userId: id },
          select: { companyName: true, status: true, feeType: true, feeValue: true },
        })
      : null;

  const buyer =
    role === "BUYER"
      ? await prisma.buyer.findFirst({
          where: { userId: id },
          select: { fullName: true, phone: true },
        })
      : null;

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-10 py-16">
      <div className="mx-auto max-w-[640px] rounded-[16px] border border-[#e6e1d6] bg-white p-8">
        <div className="mb-6 text-2xl font-extrabold tracking-tight text-[#211d18]">
          Auto<span className="text-[#c1442d]">BD</span>
        </div>

        <p className="mb-1 text-[13px] font-bold uppercase tracking-[0.04em] text-[#a39d90]">
          Signed in
        </p>
        <h1 className="mb-6 text-[22px] font-extrabold text-[#211d18]">{email}</h1>

        <dl className="mb-6 grid gap-2 text-sm text-[#211d18]">
          <div className="flex justify-between border-b border-[#f0ede5] py-2">
            <dt className="text-[#6f6a60]">Role</dt>
            <dd className="font-bold">{role}</dd>
          </div>
          {buyer && (
            <div className="flex justify-between border-b border-[#f0ede5] py-2">
              <dt className="text-[#6f6a60]">Name · phone</dt>
              <dd className="font-bold">
                {buyer.fullName} · {buyer.phone}
              </dd>
            </div>
          )}
          {org && (
            <>
              <div className="flex justify-between border-b border-[#f0ede5] py-2">
                <dt className="text-[#6f6a60]">Organization</dt>
                <dd className="font-bold">{org.companyName}</dd>
              </div>
              <div className="flex justify-between border-b border-[#f0ede5] py-2">
                <dt className="text-[#6f6a60]">Approval status</dt>
                <dd className="font-bold">{org.status}</dd>
              </div>
              <div className="flex justify-between border-b border-[#f0ede5] py-2">
                <dt className="text-[#6f6a60]">Agent fee</dt>
                <dd className="font-bold">
                  {org.feeType === "PERCENT"
                    ? `${org.feeValue.toString()}% of bid`
                    : `৳${org.feeValue.toString()} flat`}
                </dd>
              </div>
            </>
          )}
        </dl>

        <form action={logout}>
          <button
            type="submit"
            className="rounded-[10px] bg-[#211d18] px-5 py-3 text-sm font-bold text-white"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
