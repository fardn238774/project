"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { href: "/new-cars", label: "New Cars" },
  { href: "/used-cars", label: "Used Cars" },
  { href: "/auctions", label: "Reconditioned Import" },
  { href: "/modifications", label: "Modifications" },
  { href: "/research", label: "Research Hub" },
];

/// Mirrors the prototype's nav() grouping: the whole auction journey keeps
/// "Reconditioned Import" highlighted.
function isActive(href: string, pathname: string) {
  if (href === "/auctions") {
    return ["/auctions", "/escrow", "/shipment", "/rating"].some((p) =>
      pathname.startsWith(p),
    );
  }
  return pathname.startsWith(href);
}

export function AppHeader({
  email,
  role,
}: {
  email?: string | null;
  role?: Role;
}) {
  const pathname = usePathname() ?? "/";
  const initial = (email?.[0] ?? "?").toUpperCase();
  const label =
    role === "ADMIN" ? "Admin" : role === "ORGANIZATION" ? "Organization" : "Buyer";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-10 py-[18px]">
      <div className="flex items-center gap-[30px]">
        <Link href="/" className="text-[22px] font-extrabold tracking-[-0.02em] text-text">
          Auto<span className="text-accent">BD</span>
        </Link>
        <nav className="flex flex-wrap gap-1">
          {NAV.map((n) => {
            const active = isActive(n.href, pathname);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-lg px-3 py-2 text-[13.5px] ${
                  active
                    ? "bg-accent-tint font-bold text-accent"
                    : "font-normal text-text hover:text-accent"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3.5">
        <Link href="/assistant" className="text-[13px] font-bold text-accent">
          AI Assistant
        </Link>

        {email ? (
          <div className="flex items-center gap-2 rounded-[20px] bg-chip py-1.5 pl-1.5 pr-3">
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-accent text-xs font-bold text-on-accent">
              {initial}
            </span>
            <span className="text-[13px] font-semibold text-text">{label}</span>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-white"
          >
            Log in
          </Link>
        )}

        <ThemeToggle />

        {/* Buyers never see admin — gated on role, as in the prototype. */}
        {role === "ADMIN" && (
          <Link href="/admin" className="text-xs text-dim hover:text-accent">
            Admin view
          </Link>
        )}
      </div>
    </header>
  );
}
