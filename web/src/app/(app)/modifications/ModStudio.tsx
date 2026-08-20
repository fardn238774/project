"use client";

import { useMemo, useState } from "react";
import { bdt } from "@/lib/format";
import { CATEGORY_LABEL, type CatalogPart, type GarageCar } from "@/lib/parts";
import { CartItemKind, PartCategory } from "@/generated/prisma/enums";
import { AddToCartButton } from "@/components/AddToCartButton";

type Tab = "catalog" | "studio";

export function ModStudio({
  parts,
  garage,
  chassisCodes,
  initialChassis,
}: {
  parts: CatalogPart[];
  garage: GarageCar[];
  chassisCodes: string[];
  initialChassis: string | null;
}) {
  const [tab, setTab] = useState<Tab>("catalog");
  const [chassis, setChassis] = useState<string | null>(initialChassis);
  const [category, setCategory] = useState<PartCategory | "ALL">("ALL");
  const [hideIncompatible, setHideIncompatible] = useState(true);

  const visible = useMemo(() => {
    return parts
      .map((p) => ({
        ...p,
        compatible: chassis === null ? true : p.fits.includes(chassis),
      }))
      .filter((p) => (category === "ALL" ? true : p.category === category))
      .filter((p) => (chassis !== null && hideIncompatible ? p.compatible : true));
  }, [parts, chassis, category, hideIncompatible]);

  const compatibleCount = chassis
    ? parts.filter((p) => p.fits.includes(chassis)).length
    : parts.length;

  return (
    <>
      <div className="mb-5 flex gap-2">
        <TabButton on={tab === "catalog"} onClick={() => setTab("catalog")}>
          Parts &amp; fitment checker
        </TabButton>
        <TabButton on={tab === "studio"} onClick={() => setTab("studio")}>
          3D configurator
        </TabButton>
      </div>

      {tab === "catalog" ? (
        <>
          <section className="mb-5 rounded-2xl border border-border bg-card p-[22px]">
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
              Fitment checker
            </h2>
            <p className="mb-3.5 text-[13px] text-muted">
              Pick a car from your garage or enter a chassis code. The catalog then shows only
              what actually bolts on — that&apos;s the point of the checker.
            </p>

            {garage.length > 0 && (
              <div className="mb-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.03em] text-dim">
                  Your garage
                </p>
                <div className="flex flex-wrap gap-2">
                  {garage.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={!c.chassisCode}
                      onClick={() => setChassis(c.chassisCode)}
                      className={`rounded-[9px] border px-3.5 py-2 text-[13px] font-semibold transition disabled:opacity-50 ${
                        chassis && c.chassisCode === chassis
                          ? "border-accent bg-accent-tint text-accent"
                          : "border-border bg-bg text-text hover:border-accent"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.03em] text-dim">
                {garage.length > 0 ? "Or pick a chassis code" : "Pick a chassis code"}
              </p>
              <div className="flex flex-wrap gap-2">
                {chassisCodes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setChassis(code)}
                    className={`rounded-[9px] border px-3 py-1.75 text-[13px] font-semibold transition ${
                      code === chassis
                        ? "border-accent bg-accent-tint text-accent"
                        : "border-border bg-bg text-text hover:border-accent"
                    }`}
                  >
                    {code}
                  </button>
                ))}
                {chassis && (
                  <button
                    type="button"
                    onClick={() => setChassis(null)}
                    className="rounded-[9px] bg-chip px-3 py-1.75 text-[13px] font-semibold text-muted hover:text-text"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {chassis && (
              <p className="mt-3.5 rounded-lg bg-chip px-3 py-2.5 text-[13px] text-text">
                {`${compatibleCount} of ${parts.length} parts fit ${chassis}.`}
              </p>
            )}
          </section>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <FilterChip on={category === "ALL"} onClick={() => setCategory("ALL")}>
              All
            </FilterChip>
            {(Object.keys(CATEGORY_LABEL) as PartCategory[]).map((c) => (
              <FilterChip key={c} on={category === c} onClick={() => setCategory(c)}>
                {CATEGORY_LABEL[c]}
              </FilterChip>
            ))}
            {chassis && (
              <label className="ml-auto flex items-center gap-2 text-[13px] text-muted">
                <input
                  type="checkbox"
                  checked={hideIncompatible}
                  onChange={(e) => setHideIncompatible(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                Hide parts that don&apos;t fit
              </label>
            )}
          </div>

          {visible.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted">
              Nothing in this category fits {chassis}. Untick &ldquo;hide parts that don&apos;t
              fit&rdquo; to see what else exists.
            </p>
          ) : (
            <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border bg-card p-4.5"
                  style={{
                    borderColor: p.compatible ? "var(--border)" : "rgba(120,120,120,0.25)",
                    opacity: p.compatible ? 1 : 0.62,
                  }}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.03em] text-dim">
                        {p.brand}
                      </p>
                      <p className="text-[15px] font-bold text-text">{p.name}</p>
                    </div>
                    <span
                      className="shrink-0 rounded-md px-2 py-[3px] text-[10.5px] font-bold"
                      style={
                        p.compatible
                          ? { background: "#e8f5ee", color: "#1e6b42" }
                          : { background: "#efeee9", color: "#6f6a60" }
                      }
                    >
                      {p.compatible ? "Fits" : "Doesn't fit"}
                    </span>
                  </div>

                  <p className="mb-2 text-[13px] text-muted">
                    {CATEGORY_LABEL[p.category]}
                    {p.boltPattern && ` · ${p.boltPattern}`}
                    {p.offsetMm !== null && ` · ET${p.offsetMm}`}
                  </p>

                  <p className="mb-2 text-base font-extrabold text-accent">{bdt(p.priceBdt)}</p>

                  {!p.brtaLegal && (
                    <p className="rounded-md bg-[#fdf3e3] px-2 py-1.5 text-[11px] font-semibold text-[#8a5b12]">
                      Not BRTA-legal for road use
                    </p>
                  )}
                  {!p.compatible && chassis && (
                    <p className="text-[11px] text-dim">
                      {`Listed for ${p.fits.join(", ")}`}
                    </p>
                  )}

                  <div className="mt-3">
                    <AddToCartButton
                      kind={CartItemKind.MODIFICATION}
                      refId={p.id}
                      className="w-full rounded-[9px] bg-ink px-3 py-2 text-[12.5px] font-bold text-white transition hover:bg-accent hover:text-on-accent disabled:opacity-60"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-5 rounded-xl border border-border bg-chip p-4 text-[12.5px] leading-[1.5] text-muted">
            Parts are sourced through the platform&apos;s licensed bidding organization network,
            per the FR. Add parts to your cart and pay for them together with the rest of your
            order at checkout.
          </p>
        </>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-[0_12px_44px_rgba(0,0,0,0.14)]">
          <iframe
            src="/kaido-multicar-garage.html"
            title="KAIDO Garage 3D configurator"
            className="block h-[calc(100vh-220px)] min-h-[600px] w-full border-0"
          />
        </div>
      )}
    </>
  );
}

function TabButton({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[10px] px-4 py-2.5 text-[13.5px] font-bold transition ${
        on ? "bg-accent text-on-accent" : "bg-card border border-border text-text hover:border-accent"
      }`}
    >
      {children}
    </button>
  );
}

function FilterChip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[20px] px-3.5 py-2 text-[13px] transition ${
        on ? "bg-ink font-semibold text-white" : "border border-border bg-card text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
