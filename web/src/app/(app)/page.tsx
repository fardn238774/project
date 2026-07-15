import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logout } from "@/lib/auth-actions";
import { Role } from "@/generated/prisma/enums";

const PILLARS = [
  {
    href: "/new-cars",
    pillar: "Pillar 01",
    title: "Brand New Cars",
    blurb: "Dealer listings, trims & warranty terms.",
    core: false,
  },
  {
    href: "/used-cars",
    pillar: "Pillar 02",
    title: "Used Car P2P",
    blurb: "Verified ownership, direct offers.",
    core: false,
  },
  {
    href: "/auctions",
    pillar: "Pillar 03",
    title: "Reconditioned Import",
    blurb: "Choose an agent, bid live in Japan.",
    core: true,
  },
  {
    href: "/modifications",
    pillar: "Pillar 04",
    title: "Modification Studio",
    blurb: "Fitment-checked parts & kits.",
    core: false,
  },
];

export default async function HomePage() {
  // The pillars are a buyer's shopping surface; agents work from their console.
  const session = await auth();
  if (session?.user?.role === Role.ORGANIZATION) redirect("/org");

  return (
    <main className="mx-auto w-full max-w-[1180px] px-10 pb-20 pt-16">
      <div className="mb-9 max-w-[680px]">
        <p className="mb-2.5 text-[13px] font-bold uppercase tracking-[0.06em] text-accent">
          Four ways to your next car
        </p>
        <h1 className="text-[28px] font-extrabold leading-[1.15] tracking-[-0.02em] text-text">
          Choose how you&apos;d like to buy to get started.
        </h1>
      </div>

      <div className="mb-16 grid gap-[18px] md:grid-cols-2 xl:grid-cols-4">
        {PILLARS.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className={`relative rounded-2xl border p-[22px] transition hover:-translate-y-0.5 ${
              p.core
                ? "border-accent bg-accent-tint hover:shadow-[0_6px_18px_rgba(var(--accent-rgb),0.18)]"
                : "border-border bg-card hover:shadow-[0_6px_18px_rgba(0,0,0,0.06)]"
            }`}
          >
            {p.core && (
              <span className="absolute right-4 top-4 rounded-md bg-accent px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.04em] text-on-accent">
                Core
              </span>
            )}
            <p
              className={`mb-2.5 text-xs font-bold uppercase tracking-[0.04em] ${
                p.core ? "text-accent" : "text-dim"
              }`}
            >
              {p.pillar}
            </p>
            <h2 className="mb-2 text-[18px] font-bold text-text">{p.title}</h2>
            <p
              className={`text-[13px] leading-[1.5] ${
                p.core ? "text-accent" : "text-muted"
              }`}
            >
              {p.blurb}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-[18px] md:grid-cols-2">
        <Link
          href="/research"
          className="rounded-2xl border border-border bg-card p-6 transition hover:shadow-[0_6px_18px_rgba(0,0,0,0.06)]"
        >
          <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.04em] text-[#2f8f5f]">
            Dream Car Research Hub
          </p>
          <p className="text-[15px] leading-[1.5] text-text">
            Specs, reliability data, and a Bangladesh-specific total cost of ownership
            calculator.
          </p>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.04em] text-[#2f8f5f]">
            Container Pooling &amp; BRTA Tracker
          </p>
          <p className="text-[15px] leading-[1.5] text-text">
            Shared shipping to cut freight ~30%, plus visibility into registration paper
            resale value.
          </p>
        </div>
      </div>

      <form action={logout} className="mt-12">
        <button
          type="submit"
          className="rounded-[10px] border border-border bg-chip px-5 py-2.5 text-[13px] font-bold text-muted hover:text-text"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
