"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { bdt } from "@/lib/format";
import {
  createUsedCar,
  updateUsedCar,
  deleteUsedCar,
  addUsedCarPhotos,
  removeUsedCarPhoto,
  setUsedCarVideo,
  removeUsedCarVideo,
  type SystemResult,
} from "@/lib/system-actions";

// ---- data shapes (plain, already converted from Prisma Decimals) ----
export type Listing = {
  id: string;
  title: string;
  make: string;
  model: string;
  manufactureYear: number;
  mileageKm: number;
  location: string;
  priceBdt: number;
  conditionNotes: string;
  accidentStatus: string;
  status: string;
  transmission: string | null;
  fuelType: string | null;
  engineCc: number | null;
  color: string | null;
  registrationNumber: string | null;
  registrationYear: number | null;
  photoUrls: string[];
  videoUrl: string | null;
  sellerName: string;
};
export type Seller = { id: string; fullName: string };

type Action = (prev: SystemResult, fd: FormData) => Promise<SystemResult>;

const ACCIDENT_OPTIONS = [
  { value: "NOT_CHECKED", label: "Not checked" },
  { value: "NONE_FOUND", label: "None found" },
  { value: "ONE_INCIDENT", label: "One incident" },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING_VERIFICATION: "Pending review",
  ACTIVE: "Active",
  OFFER_RECEIVED: "Offer received",
  SOLD: "Sold",
  REJECTED: "Rejected",
};

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

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.03em] text-dim">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-[9px] border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block sm:col-span-2">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.03em] text-dim">
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        rows={3}
        className="w-full rounded-[9px] border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
      />
    </label>
  );
}

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

// ============================================================ the editable field set

function ListingFields({ l }: { l?: Listing }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Listing title" name="title" defaultValue={l?.title} placeholder="e.g. 2019 Toyota Axio — single owner" required />
      </div>
      <Field label="Make" name="make" defaultValue={l?.make} placeholder="Toyota" required />
      <Field label="Model" name="model" defaultValue={l?.model} placeholder="Axio" required />
      <Field label="Manufacture year" name="manufactureYear" defaultValue={l?.manufactureYear} placeholder="2019" required />
      <Field label="Mileage (km)" name="mileageKm" defaultValue={l?.mileageKm} placeholder="55000" required />
      <Field label="Price (BDT)" name="priceBdt" defaultValue={l?.priceBdt} placeholder="2400000" required />
      <Field label="Location" name="location" defaultValue={l?.location} placeholder="Dhaka" required />
      <Field label="Transmission" name="transmission" defaultValue={l?.transmission ?? ""} placeholder="Automatic" />
      <Field label="Fuel type" name="fuelType" defaultValue={l?.fuelType ?? ""} placeholder="Petrol / Hybrid" />
      <Field label="Engine (cc)" name="engineCc" defaultValue={l?.engineCc ?? ""} placeholder="1500" />
      <Field label="Colour" name="color" defaultValue={l?.color ?? ""} placeholder="Pearl white" />
      <Field label="Registration number" name="registrationNumber" defaultValue={l?.registrationNumber ?? ""} placeholder="DHAKA METRO-GA-11-1111" />
      <Field label="Registered year" name="registrationYear" defaultValue={l?.registrationYear ?? ""} placeholder="2019" />
      <SelectField label="Accident status" name="accidentStatus" defaultValue={l?.accidentStatus ?? "NOT_CHECKED"} options={ACCIDENT_OPTIONS} />
      <TextAreaField label="Condition notes" name="conditionNotes" defaultValue={l?.conditionNotes} placeholder="Overall condition, service history, anything a buyer should know…" required />
    </div>
  );
}

// ============================================================ photos & video

function ListingPhotoManager({ listing }: { listing: Listing }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-3.5">
      <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.03em] text-dim">
        Photos ({listing.photoUrls.length})
      </p>

      {listing.photoUrls.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2.5">
          {listing.photoUrls.map((url) => (
            <div key={url} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="listing" className="h-16 w-24 rounded-lg border border-border object-cover" />
              <DeleteMediaButton action={removeUsedCarPhoto} fields={{ listingId: listing.id, url }} />
            </div>
          ))}
        </div>
      )}

      <ActionForm action={addUsedCarPhotos} submitLabel="Upload photos" hidden={{ listingId: listing.id }} resetOnSuccess>
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

function ListingVideoManager({ listing }: { listing: Listing }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-3.5">
      <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.03em] text-dim">
        Walkaround video {listing.videoUrl ? "(1)" : "(none)"}
      </p>

      {listing.videoUrl && (
        <div className="relative mb-3 sm:max-w-[360px]">
          <video src={listing.videoUrl} controls preload="metadata" className="w-full rounded-lg border border-border bg-black" />
          <DeleteMediaButton action={removeUsedCarVideo} fields={{ listingId: listing.id }} />
        </div>
      )}

      <ActionForm action={setUsedCarVideo} submitLabel={listing.videoUrl ? "Replace video" : "Upload video"} hidden={{ listingId: listing.id }} resetOnSuccess>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.03em] text-dim">
            {listing.videoUrl ? "Replace with a new video" : "Add a video"} (MP4 / WebM / MOV / MKV, up to 60 MB)
          </span>
          <input
            name="video"
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
            className="block w-full text-[12.5px] text-muted file:mr-3 file:rounded-md file:border-0 file:bg-chip file:px-3 file:py-1.5 file:text-[12px] file:font-bold file:text-text"
          />
        </label>
      </ActionForm>
    </div>
  );
}

/** Small "×" overlay button for removing a photo or video. */
function DeleteMediaButton({ action, fields }: { action: Action; fields: Record<string, string> }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const fd = new FormData();
        for (const [k, v] of Object.entries(fields)) fd.set(k, v);
        start(async () => {
          await action({}, fd);
        });
      }}
      title="Remove"
      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#c1442d] text-[13px] font-bold text-white shadow disabled:opacity-50"
    >
      ×
    </button>
  );
}

// ============================================================ listing rows

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "ACTIVE" || status === "OFFER_RECEIVED"
      ? "bg-[#e8f5ee] text-[#1e6b42]"
      : status === "PENDING_VERIFICATION"
        ? "bg-[#fdf3e3] text-[#8a5b12]"
        : status === "REJECTED"
          ? "bg-[#fdecea] text-[#c1442d]"
          : "bg-chip text-dim";
  return (
    <span className={`shrink-0 rounded-md px-2 py-[3px] text-[10.5px] font-bold ${tone}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function ListingRow({ listing }: { listing: Listing }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="min-w-0 text-left">
          <p className="flex items-center gap-2 text-[14.5px] font-bold text-text">
            <span>{open ? "▾ " : "▸ "}{listing.title}</span>
            <StatusBadge status={listing.status} />
          </p>
          <p className="text-[12px] text-dim">
            {listing.manufactureYear} {listing.make} {listing.model} · {bdt(listing.priceBdt)} ·{" "}
            {listing.photoUrls.length} photos · {listing.videoUrl ? "1 video" : "no video"} · Seller:{" "}
            {listing.sellerName}
          </p>
        </button>
        <DeleteButton
          action={deleteUsedCar}
          fields={{ id: listing.id }}
          confirmMsg={`Delete "${listing.title}"? This also removes its offers.`}
        />
      </div>

      {open && (
        <div className="grid gap-3.5 border-t border-track p-4">
          <ActionForm action={updateUsedCar} submitLabel="Save details" hidden={{ id: listing.id }}>
            <ListingFields l={listing} />
          </ActionForm>
          <ListingPhotoManager listing={listing} />
          <ListingVideoManager listing={listing} />
        </div>
      )}
    </div>
  );
}

// ============================================================ top level

export function UsedCarsManager({ listings, sellers }: { listings: Listing[]; sellers: Seller[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {listings.length} {listings.length === 1 ? "listing" : "listings"} in the catalog.
        </p>
        <SectionToggle open={adding} onClick={() => setAdding((v) => !v)}>
          Add listing
        </SectionToggle>
      </div>

      {adding && (
        <ActionForm
          action={createUsedCar}
          submitLabel="Add listing"
          resetOnSuccess
          className="rounded-2xl border border-dashed border-border bg-card p-5"
        >
          {sellers.length === 0 ? (
            <p className="mb-3 text-[13px] text-accent">
              No buyer accounts exist to attach a listing to. Create a buyer first.
            </p>
          ) : (
            <div className="mb-2.5">
              <SelectField
                label="Seller (buyer account)"
                name="sellerId"
                options={sellers.map((s) => ({ value: s.id, label: s.fullName }))}
              />
            </div>
          )}
          <ListingFields />
          <p className="mt-2 text-[11.5px] text-dim">
            Admin-added listings publish straight to the marketplace. Open the listing after saving to
            add photos and a video.
          </p>
        </ActionForm>
      )}

      {listings.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-[13px] text-dim">
          No listings yet.
        </p>
      ) : (
        listings.map((l) => <ListingRow key={l.id} listing={l} />)
      )}
    </div>
  );
}
