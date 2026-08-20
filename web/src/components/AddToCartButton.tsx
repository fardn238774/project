"use client";

import { useState, useTransition } from "react";
import { addToCart } from "@/lib/cart-actions";
import type { CartItemKind } from "@/generated/prisma/enums";

/** Adds an item from any pillar to the universal cart. */
export function AddToCartButton({
  kind,
  refId,
  label = "Add to cart",
  className,
}: {
  kind: CartItemKind;
  refId: string;
  label?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = () =>
    start(async () => {
      setError(null);
      const r = await addToCart(kind, refId);
      if (r.error) setError(r.error);
      else setAdded(true);
    });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || added}
          onClick={onClick}
          className={
            className ??
            "rounded-[10px] bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-accent hover:text-on-accent disabled:opacity-60"
          }
        >
          {pending ? "Adding…" : added ? "Added to cart ✓" : label}
        </button>
        {added && (
          <a href="/cart" className="text-[13px] font-bold text-accent hover:underline">
            View cart &rarr;
          </a>
        )}
      </div>
      {error && <p className="mt-1.5 text-[12.5px] font-semibold text-accent">{error}</p>}
    </div>
  );
}
