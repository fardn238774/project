"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { bdt } from "@/lib/format";
import { BrandMonogram } from "@/components/BrandMonogram";
import {
  createBrand,
  updateBrand,
  deleteBrand,
  createCar,
  updateCar,
  deleteCar,
  addCarPhotos,
  removeCarPhoto,
  addCarVideos,
  removeCarVideo,
  createVariant,
  updateVariant,
  deleteVariant,
  type SystemResult,
} from "@/lib/system-actions";

// ---- data shapes (plain, already converted from Prisma Decimals) ----
type Variant = {
  id: string;
  name: string;
  priceBdt: number;
  engine: string;
  transmission: string;
  economyKmPerL: number;
};
type Car = {
  id: string;
  model: string;
  priceMinBdt: number;
  priceMaxBdt: number;
  warrantyYears: number;
  warrantyKm: number;
  photoUrls: string[];
  videoUrls: string[];
  variants: Variant[];
};
type Brand = {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  logoUrl: string | null;
  cars: Car[];
};

type Action = (prev: SystemResult, fd: FormData) => Promise<SystemResult>;

// ============================================================ small building blocks

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.03em] text-dim">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-[9px] border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
      />
    </label>
  );
}

/** A form wired to a (prev, formData) server action, with inline feedback. */
function ActionForm({
  action,
  children,
  submitLabel,
  className,
  resetOnSuccess,
  hidden,
}: {
  action: Action;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
  resetOnSuccess?: boolean;
  hidden?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, {} as SystemResult);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {hidden &&
        Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[9px] bg-accent px-4 py-2 text-[13px] font-bold text-on-accent transition hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        {state.error && <span className="text-[12.5px] font-semibold text-accent">{state.error}</span>}
        {state.ok && !state.error && (
          <span className="text-[12.5px] font-semibold text-[#2f8f5f]">Saved ✓</span>
        )}
      </div>
    </form>
  );
}

/** A destructive button that confirms, then calls a (prev, formData) action. */
function DeleteButton({
  action,
  fields,
  confirmMsg,
  label = "Delete",
}: {
  action: Action;
  fields: Record<string, string>;
  confirmMsg: string;
  label?: string;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(confirmMsg)) return;
          const fd = new FormData();
          for (const [k, v] of Object.entries(fields)) fd.set(k, v);
          start(async () => {
            const r = await action({}, fd);
            if (r?.error) setErr(r.error);
          });
        }}
        className="text-[12px] font-bold text-[#c1442d] hover:underline disabled:opacity-50"
      >
        {pending ? "Deleting…" : label}
      </button>
      {err && <span className="text-[12px] text-accent">{err}</span>}
    </span>
  );
}

function SectionToggle({
  open,
  onClick,
  children,
}: {
  open: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[9px] border border-border bg-bg px-3 py-1.5 text-[12.5px] font-bold text-text transition hover:border-accent"
    >
      {open ? "− " : "+ "}
      {children}
    </button>
  );
}

// ============================================================ variants

function VariantRow({ variant }: { variant: Variant }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="border-t border-track py-2.5 first:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-bold text-text">{variant.name}</p>
          <p className="text-[12px] text-dim">
            {bdt(variant.priceBdt)} · {variant.engine} · {variant.transmission} ·{" "}
            {variant.economyKmPerL} km/l
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="text-[12px] font-bold text-accent hover:underline"
          >
            {editing ? "Close" : "Edit"}
          </button>
          <DeleteButton
            action={deleteVariant}
            fields={{ id: variant.id }}
            confirmMsg={`Delete variant "${variant.name}"?`}
          />
        </div>
      </div>
      {editing && (
        <ActionForm action={updateVariant} submitLabel="Save variant" hidden={{ id: variant.id }} className="mt-2.5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="Variant name" name="name" defaultValue={variant.name} required />
            <Field label="Price (BDT)" name="priceBdt" defaultValue={variant.priceBdt} required />
            <Field label="Engine" name="engine" defaultValue={variant.engine} required />
            <Field label="Transmission" name="transmission" defaultValue={variant.transmission} required />
            <Field label="Economy (km/l)" name="economyKmPerL" defaultValue={variant.economyKmPerL} required />
          </div>
        </ActionForm>
      )}
    </div>
  );
}

function VariantManager({ car }: { car: Car }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-bg p-3.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[12px] font-bold uppercase tracking-[0.03em] text-dim">
          Variants ({car.variants.length})
        </p>
        <SectionToggle open={adding} onClick={() => setAdding((v) => !v)}>
          Add variant
        </SectionToggle>
      </div>

      {car.variants.length === 0 ? (
        <p className="py-1 text-[12.5px] text-dim">No variants yet — add at least one so buyers see a price.</p>
      ) : (
        car.variants.map((v) => <VariantRow key={v.id} variant={v} />)
      )}

      {adding && (
        <ActionForm
          action={createVariant}
          submitLabel="Add variant"
          hidden={{ carId: car.id }}
          resetOnSuccess
          className="mt-3 rounded-lg border border-dashed border-border p-3"
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="Variant name" name="name" placeholder="e.g. G Package" required />
            <Field label="Price (BDT)" name="priceBdt" placeholder="e.g. 4200000" required />
            <Field label="Engine" name="engine" placeholder="e.g. 1.5L Hybrid" required />
            <Field label="Transmission" name="transmission" placeholder="e.g. e-CVT" required />
            <Field label="Economy (km/l)" name="economyKmPerL" placeholder="e.g. 27" required />
          </div>
        </ActionForm>
      )}
    </div>
  );
}

// ============================================================ photos

function PhotoManager({ car }: { car: Car }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-3.5">
      <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.03em] text-dim">
        Photos ({car.photoUrls.length})
      </p>

      {car.photoUrls.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2.5">
          {car.photoUrls.map((url) => (
            <div key={url} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="car"
                className="h-16 w-24 rounded-lg border border-border object-cover"
              />
              <DeletePhotoButton carId={car.id} url={url} />
            </div>
          ))}
        </div>
      )}

      <ActionForm
        action={addCarPhotos}
        submitLabel="Upload photos"
        hidden={{ carId: car.id }}
        resetOnSuccess
      >
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.03em] text-dim">
            Add photos (JPG / PNG / WebP, up to 6 MB each)
          </span>
          <input
            name="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="block w-full text-[12.5px] text-muted file:mr-3 file:rounded-md file:border-0 file:bg-chip file:px-3 file:py-1.5 file:text-[12px] file:font-bold file:text-text"
          />
        </label>
      </ActionForm>
    </div>
  );
}

function DeletePhotoButton({ carId, url }: { carId: string; url: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const fd = new FormData();
        fd.set("carId", carId);
        fd.set("url", url);
        start(async () => {
          await removeCarPhoto({}, fd);
        });
      }}
      title="Remove photo"
      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#c1442d] text-[12px] font-bold text-white shadow disabled:opacity-50"
    >
      ×
    </button>
  );
}

// ============================================================ videos

function VideoManager({ car }: { car: Car }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-3.5">
      <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.03em] text-dim">
        Videos ({car.videoUrls.length})
      </p>

      {car.videoUrls.length > 0 && (
        <div className="mb-3 grid gap-2.5 sm:grid-cols-2">
          {car.videoUrls.map((url) => (
            <div key={url} className="relative">
              <video
                src={url}
                controls
                preload="metadata"
                className="w-full rounded-lg border border-border bg-black"
              />
              <DeleteVideoButton carId={car.id} url={url} />
            </div>
          ))}
        </div>
      )}

      <ActionForm
        action={addCarVideos}
        submitLabel="Upload videos"
        hidden={{ carId: car.id }}
        resetOnSuccess
      >
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.03em] text-dim">
            Add videos (MP4 / WebM / MOV / MKV, up to 60 MB each)
          </span>
          <input
            name="videos"
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
            multiple
            className="block w-full text-[12.5px] text-muted file:mr-3 file:rounded-md file:border-0 file:bg-chip file:px-3 file:py-1.5 file:text-[12px] file:font-bold file:text-text"
          />
        </label>
      </ActionForm>
    </div>
  );
}

function DeleteVideoButton({ carId, url }: { carId: string; url: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const fd = new FormData();
        fd.set("carId", carId);
        fd.set("url", url);
        start(async () => {
          await removeCarVideo({}, fd);
        });
      }}
      title="Remove video"
      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#c1442d] text-[13px] font-bold text-white shadow disabled:opacity-50"
    >
      ×
    </button>
  );
}

// ============================================================ car rows

function CarRow({ car, brand }: { car: Car; brand: Brand }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="min-w-0 text-left">
          <p className="text-[14.5px] font-bold text-text">
            {open ? "▾ " : "▸ "}
            {car.model}
          </p>
          <p className="text-[12px] text-dim">
            {bdt(car.priceMinBdt)}–{bdt(car.priceMaxBdt)} · {car.warrantyYears}yr /{" "}
            {car.warrantyKm.toLocaleString("en-US")} km · {car.photoUrls.length} photos ·{" "}
            {car.variants.length} variants
          </p>
        </button>
        <DeleteButton
          action={deleteCar}
          fields={{ id: car.id }}
          confirmMsg={`Delete "${brand.name} ${car.model}" and all its variants and photos?`}
        />
      </div>

      {open && (
        <div className="grid gap-3.5 border-t border-track p-4">
          <ActionForm action={updateCar} submitLabel="Save details" hidden={{ id: car.id }}>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Field label="Model name" name="model" defaultValue={car.model} required />
              <div />
              <Field label="Min price (BDT)" name="priceMinBdt" defaultValue={car.priceMinBdt} required />
              <Field label="Max price (BDT)" name="priceMaxBdt" defaultValue={car.priceMaxBdt} required />
              <Field label="Warranty (years)" name="warrantyYears" defaultValue={car.warrantyYears} required />
              <Field label="Warranty (km)" name="warrantyKm" defaultValue={car.warrantyKm} required />
            </div>
          </ActionForm>

          <PhotoManager car={car} />
          <VideoManager car={car} />
          <VariantManager car={car} />
        </div>
      )}
    </div>
  );
}

// ============================================================ brand cards

function BrandCard({ brand }: { brand: Brand }) {
  const [editing, setEditing] = useState(false);
  const [addingCar, setAddingCar] = useState(false);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <BrandMonogram name={brand.name} slug={brand.slug} logoUrl={brand.logoUrl} size={48} />
          <div className="min-w-0">
            <p className="text-[18px] font-extrabold text-text">{brand.name}</p>
            <p className="text-[12.5px] text-dim">
              {brand.country ? `${brand.country} · ` : ""}
              {brand.cars.length} {brand.cars.length === 1 ? "model" : "models"} · /{brand.slug}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="text-[12.5px] font-bold text-accent hover:underline"
          >
            {editing ? "Close" : "Edit brand"}
          </button>
          <DeleteButton
            action={deleteBrand}
            fields={{ id: brand.id }}
            confirmMsg={`Delete brand "${brand.name}"? This also removes its car models and dealers.`}
          />
        </div>
      </div>

      {editing && (
        <ActionForm
          action={updateBrand}
          submitLabel="Save brand"
          hidden={{ id: brand.id }}
          className="mt-4 rounded-xl border border-border bg-bg p-4"
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="Brand name" name="name" defaultValue={brand.name} required />
            <Field label="Country" name="country" defaultValue={brand.country ?? ""} placeholder="e.g. Japan" />
          </div>
          <label className="mt-2.5 block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.03em] text-dim">
              Replace logo (optional)
            </span>
            <input
              name="logo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="block w-full text-[12.5px] text-muted file:mr-3 file:rounded-md file:border-0 file:bg-chip file:px-3 file:py-1.5 file:text-[12px] file:font-bold file:text-text"
            />
          </label>
        </ActionForm>
      )}

      <div className="mt-4 grid gap-2.5">
        {brand.cars.length === 0 ? (
          <p className="text-[13px] text-dim">No car models yet. Add the first one below.</p>
        ) : (
          brand.cars.map((c) => <CarRow key={c.id} car={c} brand={brand} />)
        )}
      </div>

      <div className="mt-3">
        <SectionToggle open={addingCar} onClick={() => setAddingCar((v) => !v)}>
          Add car model
        </SectionToggle>
      </div>

      {addingCar && (
        <ActionForm
          action={createCar}
          submitLabel="Add car model"
          hidden={{ brandId: brand.id }}
          resetOnSuccess
          className="mt-3 rounded-xl border border-dashed border-border p-4"
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="Model name" name="model" placeholder="e.g. Corolla Cross" required />
            <div />
            <Field label="Min price (BDT)" name="priceMinBdt" placeholder="e.g. 3500000" required />
            <Field label="Max price (BDT)" name="priceMaxBdt" placeholder="e.g. 4800000" required />
            <Field label="Warranty (years)" name="warrantyYears" placeholder="e.g. 3" required />
            <Field label="Warranty (km)" name="warrantyKm" placeholder="e.g. 100000" required />
          </div>
          <p className="mt-2 text-[11.5px] text-dim">
            After adding, open the model to upload photos and add variants.
          </p>
        </ActionForm>
      )}
    </section>
  );
}

// ============================================================ top level

export function NewCarsManager({ brands }: { brands: Brand[] }) {
  const [addingBrand, setAddingBrand] = useState(false);

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {brands.length} {brands.length === 1 ? "brand" : "brands"} in the catalog.
        </p>
        <SectionToggle open={addingBrand} onClick={() => setAddingBrand((v) => !v)}>
          Add brand
        </SectionToggle>
      </div>

      {addingBrand && (
        <ActionForm
          action={createBrand}
          submitLabel="Add brand"
          resetOnSuccess
          className="rounded-2xl border border-dashed border-border bg-card p-5"
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="Brand name" name="name" placeholder="e.g. Toyota" required />
            <Field label="Country" name="country" placeholder="e.g. Japan" />
          </div>
          <label className="mt-2.5 block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.03em] text-dim">
              Logo (optional)
            </span>
            <input
              name="logo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="block w-full text-[12.5px] text-muted file:mr-3 file:rounded-md file:border-0 file:bg-chip file:px-3 file:py-1.5 file:text-[12px] file:font-bold file:text-text"
            />
          </label>
        </ActionForm>
      )}

      {brands.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-[13px] text-dim">
          No brands yet. Click <strong>Add brand</strong> to create the first one.
        </p>
      ) : (
        brands.map((b) => <BrandCard key={b.id} brand={b} />)
      )}
    </div>
  );
}
