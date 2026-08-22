"use client";

import { useEffect, useMemo, useState } from "react";
import { bdt } from "@/lib/format";
import { CATEGORY_LABEL, type CatalogPart, type GarageCar } from "@/lib/parts";
import { CartItemKind, PartCategory } from "@/generated/prisma/enums";
import { AddToCartButton } from "@/components/AddToCartButton";
import {
  VEHICLES,
  vehicleBrands,
  vehicleModels,
  vehicleYears,
  vehicleVersions,
  resolveChassis,
} from "@/lib/vehicles";

type Tab = "catalog" | "studio";

/** From a chassis code, recover a brand/model/year/version to prefill the picker. */
function prefill(chassisCode: string | null) {
  if (!chassisCode) return { brand: "", model: "", year: "", version: "" };
  const v = VEHICLES.find((x) => x.chassisCode === chassisCode);
  return v
    ? { brand: v.brand, model: v.model, year: String(v.year), version: v.version }
    : { brand: "", model: "", year: "", version: "" };
}

export function ModStudio({
  parts,
  garage,
  initialChassis,
}: {
  parts: CatalogPart[];
  garage: GarageCar[];
  initialChassis: string | null;
}) {
  const [tab, setTab] = useState<Tab>("catalog");

  // Open the 3D configurator in the app's current light/dark theme.
  const [configTheme, setConfigTheme] = useState<"light" | "dark">("dark");
  useEffect(() => {
    setConfigTheme(
      document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light",
    );
  }, []);

  const init = prefill(initialChassis);
  const [brand, setBrand] = useState(init.brand);
  const [model, setModel] = useState(init.model);
  const [year, setYear] = useState(init.year);
  const [version, setVersion] = useState(init.version);
  const [chassis, setChassis] = useState<string | null>(initialChassis);

  const [category, setCategory] = useState<PartCategory | "ALL">("ALL");
  const [hideIncompatible, setHideIncompatible] = useState(true);

  const brands = vehicleBrands();
  const models = brand ? vehicleModels(brand) : [];
  const years = brand && model ? vehicleYears(brand, model) : [];
  const versions = brand && model && year ? vehicleVersions(brand, model, Number(year)) : [];

  const pickBrand = (b: string) => {
    setBrand(b); setModel(""); setYear(""); setVersion(""); setChassis(null);
  };
  const pickModel = (m: string) => {
    setModel(m); setYear(""); setVersion(""); setChassis(null);
  };
  const pickYear = (y: string) => {
    setYear(y); setVersion(""); setChassis(null);
  };
  const pickVersion = (v: string) => {
    setVersion(v);
    setChassis(v ? resolveChassis(brand, model, Number(year), v) : null);
  };
  const reset = () => {
    setBrand(""); setModel(""); setYear(""); setVersion(""); setChassis(null);
  };
  const pickGarage = (chassisCode: string | null) => {
    const p = prefill(chassisCode);
    setBrand(p.brand); setModel(p.model); setYear(p.year); setVersion(p.version);
    setChassis(chassisCode);
  };

  const visible = useMemo(() => {
    return parts
      .map((p) => ({ ...p, compatible: chassis === null ? true : p.fits.includes(chassis) }))
      .filter((p) => (category === "ALL" ? true : p.category === category))
      .filter((p) => (chassis !== null && hideIncompatible ? p.compatible : true));
  }, [parts, chassis, category, hideIncompatible]);

  const compatibleCount = chassis ? parts.filter((p) => p.fits.includes(chassis)).length : parts.length;
  const carLabel = chassis && brand ? `${brand} ${model} ${year} · ${version}` : null;

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
          {/* ---- cascading car picker ---- */}
          <section className="mb-5 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border bg-gradient-to-r from-accent-tint to-transparent px-[22px] py-4">
              <h2 className="text-[15px] font-extrabold text-text">Find parts for your car</h2>
              <p className="mt-0.5 text-[13px] text-muted">
                Choose your brand, model, year and version — we&apos;ll show only what actually fits.
              </p>
            </div>

            <div className="p-[22px]">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Picker label="1 · Brand" value={brand} onChange={pickBrand} options={brands} placeholder="Select brand" />
                <Picker label="2 · Model" value={model} onChange={pickModel} options={models} placeholder="Select model" disabled={!brand} />
                <Picker
                  label="3 · Year"
                  value={year}
                  onChange={pickYear}
                  options={years.map(String)}
                  placeholder="Select year"
                  disabled={!model}
                />
                <Picker label="4 · Version" value={version} onChange={pickVersion} options={versions} placeholder="Select version" disabled={!year} />
              </div>

              {garage.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-bold uppercase tracking-[0.03em] text-dim">
                    Or your garage:
                  </span>
                  {garage.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={!c.chassisCode}
                      onClick={() => pickGarage(c.chassisCode)}
                      className="rounded-full border border-border bg-bg px-3 py-1.5 text-[12.5px] font-semibold text-text transition hover:border-accent disabled:opacity-50"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}

              {carLabel ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-accent-tint px-4 py-3">
                  <p className="text-[13.5px] text-text">
                    Showing parts for <span className="font-bold">{carLabel}</span> —{" "}
                    <span className="font-bold text-accent">{compatibleCount}</span> of {parts.length} parts fit.
                  </p>
                  <button type="button" onClick={reset} className="text-[12.5px] font-bold text-accent hover:underline">
                    Reset
                  </button>
                </div>
              ) : chassis ? (
                <div className="mt-4 rounded-xl bg-chip px-4 py-3 text-[13px] text-muted">
                  Showing parts for chassis <span className="font-bold text-text">{chassis}</span>.
                </div>
              ) : (
                <p className="mt-4 text-[12.5px] text-dim">
                  Pick a car above to filter the catalog to compatible parts. Until then, every part is shown.
                </p>
              )}
            </div>
          </section>

          {/* ---- category filters ---- */}
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

          {/* ---- parts grid ---- */}
          {visible.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted">
              Nothing in this category fits {carLabel ?? chassis}. Untick &ldquo;hide parts that
              don&apos;t fit&rdquo; to see what else exists.
            </p>
          ) : (
            <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((p) => (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-2xl border bg-card"
                  style={{
                    borderColor: p.compatible ? "var(--border)" : "rgba(120,120,120,0.25)",
                    opacity: p.compatible ? 1 : 0.62,
                  }}
                >
                  {p.photoUrls.length > 0 && (
                    <div className="relative h-[140px] w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.photoUrls[0]} alt={p.name} className="h-full w-full object-cover" />
                      {p.videoUrls.length > 0 && (
                        <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[10.5px] font-bold text-white">
                          ▶ {p.videoUrls.length}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="p-4.5">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.03em] text-dim">{p.brand}</p>
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
                      <p className="text-[11px] text-dim">{`Listed for ${p.fits.join(", ")}`}</p>
                    )}

                    <div className="mt-3">
                      <AddToCartButton
                        kind={CartItemKind.MODIFICATION}
                        refId={p.id}
                        className="w-full rounded-[9px] bg-ink px-3 py-2 text-[12.5px] font-bold text-white transition hover:bg-accent hover:text-on-accent disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-5 rounded-xl border border-border bg-chip p-4 text-[12.5px] leading-[1.5] text-muted">
            Parts are sourced through the platform&apos;s licensed bidding organization network, per
            the FR. Add parts to your cart and pay for them together with the rest of your order at
            checkout.
          </p>
        </>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-bg shadow-[0_12px_44px_rgba(0,0,0,0.14)]">
          <iframe
            src={`/kaido-multicar-garage.html?theme=${configTheme}`}
            title="KAIDO Garage 3D configurator"
            className="block h-[calc(100vh-220px)] min-h-[600px] w-full border-0"
          />
        </div>
      )}
    </>
  );
}

function Picker({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.04em] text-dim">
        {label}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[10px] border border-border bg-bg px-3.5 py-2.5 text-sm font-semibold text-text outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-45"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
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
