"use client";

import { useOptimistic, useTransition } from "react";
import { toggleWishlist } from "@/lib/wishlist-actions";

export function WishlistButton({
  auctionCarId,
  initial,
  disabled,
}: {
  auctionCarId: string;
  initial: boolean;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  // The heart must flip instantly; the server action reconciles it.
  const [on, setOn] = useOptimistic(initial);

  return (
    <button
      type="button"
      disabled={disabled || pending}
      aria-pressed={on}
      aria-label={on ? "Remove from wishlist" : "Add to wishlist"}
      onClick={() =>
        startTransition(async () => {
          setOn(!on);
          await toggleWishlist(auctionCarId);
        })
      }
      className="absolute right-2 top-2 flex h-[34px] w-[34px] items-center justify-center rounded-full border border-border text-base shadow-[0_1px_4px_rgba(0,0,0,0.12)] transition disabled:opacity-60"
      style={
        on
          ? { background: "#c1442d", color: "#fff" }
          : { background: "var(--card-bg)", color: "var(--dim)" }
      }
    >
      {on ? "♥" : "♡"}
    </button>
  );
}
