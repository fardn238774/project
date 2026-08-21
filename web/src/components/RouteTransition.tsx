"use client";

import { usePathname } from "next/navigation";

/**
 * Wraps the app's page content and re-keys on the pathname so each route change
 * replays a smooth crossfade (`.route-fade` in globals.css). Query-only changes
 * keep the same pathname, so filter clicks don't re-animate.
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="route-fade">
      {children}
    </div>
  );
}
