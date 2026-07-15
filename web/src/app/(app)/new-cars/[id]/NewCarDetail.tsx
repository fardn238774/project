"use client";

import { useActionState, useState } from "react";
import { submitInquiry, type InquiryResult } from "@/lib/new-car-actions";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";

type Variant = {
  id: string;
  name: string;
  price: string;
  engine: string;
  trans: string;
  economy: string;
};

export function NewCarDetail({
  brand,
  warranty,
  warrantyKm,
  variants,
  isBuyer,
  inquiredVariantIds,
}: {
  brand: string;
  warranty: string;
  warrantyKm: string;
  variants: Variant[];
  isBuyer: boolean;
  inquiredVariantIds: string[];
}) {
  const [index, setIndex] = useState(0);
  const [state, action, pending] = useActionState<InquiryResult, FormData>(submitInquiry, {});

  const selected = variants[index];
  if (!selected) return <p className="text-sm text-muted">No variants listed for this model.</p>;

  // Server-rendered inquiries plus the one just submitted in this session.
  const sent = inquiredVariantIds.includes(selected.id) || state.ok;

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2">
        {variants.map((v, i) => {
          const active = i === index;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`rounded-[9px] border px-4 py-2.5 text-[13px] font-bold transition ${
                active
                  ? "border-accent bg-accent text-on-accent"
                  : "border-border bg-card text-text hover:border-accent"
              }`}
            >
              {v.name} &middot; {v.price}
            </button>
          );
        })}
      </div>

      <section className="mb-4.5 rounded-2xl border border-border bg-card p-[22px]">
        <h2 className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          Specifications — {selected.name}
        </h2>
        <div className="grid gap-3 text-sm text-text md:grid-cols-2">
          <p>
            <span className="text-dim">Engine</span> &middot; {selected.engine}
          </p>
          <p>
            <span className="text-dim">Transmission</span> &middot; {selected.trans}
          </p>
          <p>
            <span className="text-dim">Fuel economy</span> &middot; {selected.economy}
          </p>
          <p>
            <span className="text-dim">Warranty</span> &middot; {warranty}, {warrantyKm}
          </p>
        </div>
      </section>

      <section className="mb-4.5 rounded-2xl border border-border bg-card p-[22px]">
        <h2 className="mb-2.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          Nearest authorised service center
        </h2>
        <PhotoPlaceholder
          label="Google Maps — service center locator"
          height={120}
          tint="green"
        />
      </section>

      {sent ? (
        <p className="rounded-xl border border-[#cfe3d6] bg-[#f4f9f6] p-4 text-sm font-semibold text-[#2f8f5f]">
          {`Inquiry sent to your nearest ${brand} dealer partner. They'll contact you within 24 hours.`}
        </p>
      ) : (
        <form action={action}>
          <input type="hidden" name="variantId" value={selected.id} />
          <button
            type="submit"
            disabled={pending || !isBuyer}
            className="w-full rounded-[11px] bg-accent px-4 py-3.5 text-[15px] font-bold text-on-accent transition hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Sending…" : `Submit dealer inquiry for ${selected.name}`}
          </button>
          {!isBuyer && (
            <p className="mt-2 text-center text-[13px] text-muted">
              Dealer inquiries are available on buyer accounts.
            </p>
          )}
          {state.error && (
            <p className="mt-2 text-center text-[13px] font-semibold text-accent">{state.error}</p>
          )}
        </form>
      )}
    </>
  );
}
