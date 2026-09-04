"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Role } from "@/generated/prisma/enums";
import { ThemeToggle } from "@/components/ThemeToggle";
import { logout } from "@/lib/auth-actions";

const NAV = [
  { href: "/new-cars", label: "New Cars" },
  { href: "/used-cars", label: "Used Cars" },
  { href: "/auctions", label: "Reconditioned Import" },
  { href: "/modifications", label: "Modifications" },
  { href: "/research", label: "Research Hub" },
  { href: "/services", label: "Services" },
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
  orgName,
  cartCount = 0,
}: {
  email?: string | null;
  role?: Role;
  orgName?: string | null;
  cartCount?: number;
}) {
  const pathname = usePathname() ?? "/";
  const [menuOpen, setMenuOpen] = useState(false);
  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const initial = (email?.[0] ?? "?").toUpperCase();
  const label =
    role === "ADMIN" ? "Admin" : role === "ORGANIZATION" ? "Organization" : "Buyer";

  // Organizations get the prototype's distinct dark agent-console header —
  // they advise buyers rather than shop, so the buyer pillars don't apply.
  if (role === "ORGANIZATION") {
    return (
      <header className="flex items-center justify-between gap-3 border-b border-[#211d18] bg-ink px-4 py-[18px] sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/org" className="shrink-0 text-[22px] font-extrabold tracking-[-0.02em] text-white">
            Auto<span className="text-[#e2765f]">BD</span>
            <span className="ml-1.5 hidden text-[13px] font-semibold text-dim sm:inline">Bidding Org</span>
          </Link>
          {orgName && (
            <span className="truncate border-l border-[#3a352d] pl-3 text-[13px] text-[#c9c4ba]">
              {orgName}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3.5">
          <ThemeToggle />
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg bg-[#211d18] px-3.5 py-2 text-[13px] text-[#e2e0d9] hover:text-white"
            >
              Log out
            </button>
          </form>
        </div>
      </header>
    );
  }

  return (
    <header className="glass sticky top-0 z-30 border-b border-border shadow-[0_10px_30px_-24px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-[30px]">
          <Link
            href="/"
            className="inline-block shrink-0 text-[22px] font-extrabold tracking-[-0.02em] text-text transition-transform duration-200 hover:scale-[1.04]"
          >
            Auto<span className="text-accent">BD</span>
          </Link>
          {/* Full inline nav on large screens; collapses to a menu below lg. */}
          <nav className="hidden flex-wrap gap-1 lg:flex">
            {NAV.map((n) => {
              const active = isActive(n.href, pathname);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`rounded-lg px-3 py-2 text-[13.5px] transition-all duration-200 ${
                    active
                      ? "bg-accent-tint font-bold text-accent shadow-[inset_0_0_0_1px_rgba(var(--accent-rgb),0.28)]"
                      : "font-medium text-muted hover:-translate-y-px hover:bg-chip hover:text-text"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3.5">
          <Link href="/assistant" className="hidden text-[13px] font-bold text-accent lg:inline">
            AI Assistant
          </Link>

          <Link href="/cart" className="relative text-[13px] font-bold text-text hover:text-accent">
            Cart
            {cartCount > 0 && (
              <span className="animate-glow absolute -right-3.5 -top-2 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent">
                {cartCount}
              </span>
            )}
          </Link>

          {email ? (
            <div className="hidden items-center gap-2 rounded-[20px] bg-chip py-1.5 pl-1.5 pr-3 transition-colors hover:bg-track sm:flex">
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-accent text-xs font-bold text-on-accent">
                {initial}
              </span>
              <span className="text-[13px] font-semibold text-text">{label}</span>
            </div>
          ) : (
            <Link
              href="/login"
              className="sheen hidden rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-accent hover:text-on-accent sm:inline"
            >
              Log in
            </Link>
          )}

          <ThemeToggle />

          {/* Buyers never see admin — gated on role, as in the prototype. */}
          {role === "ADMIN" && (
            <Link href="/admin" className="hidden text-xs text-dim hover:text-accent lg:inline">
              Admin view
            </Link>
          )}

          {/* Hamburger — only below lg, where the inline nav is hidden. */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-text hover:bg-chip lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              {menuOpen ? (
                <>
                  <line x1="5" y1="5" x2="19" y2="19" />
                  <line x1="19" y1="5" x2="5" y2="19" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="border-t border-border bg-card px-4 py-3 lg:hidden">
          <nav className="grid gap-1">
            {NAV.map((n) => {
              const active = isActive(n.href, pathname);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`rounded-lg px-3 py-2.5 text-[14px] transition ${
                    active
                      ? "bg-accent-tint font-bold text-accent"
                      : "font-medium text-muted hover:bg-chip hover:text-text"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
            <Link href="/assistant" className="rounded-lg px-3 py-2.5 text-[14px] font-bold text-accent hover:bg-chip">
              AI Assistant
            </Link>
            {role === "ADMIN" && (
              <Link href="/admin" className="rounded-lg px-3 py-2.5 text-[14px] font-medium text-muted hover:bg-chip hover:text-text">
                Admin view
              </Link>
            )}
          </nav>
          {email && (
            <div className="mt-3 flex items-center gap-2 border-t border-track pt-3">
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-accent text-xs font-bold text-on-accent">
                {initial}
              </span>
              <span className="text-[13px] font-semibold text-text">{`Signed in as ${label}`}</span>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
