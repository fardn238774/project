"use client";

import { useActionState, useState } from "react";
import { createListing, type CreateListingResult } from "@/lib/used-car-actions";
import { AccidentStatus } from "@/generated/prisma/enums";

const MAX_PHOTOS = 8;

const inputCls =
  "w-full rounded-[9px] border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none focus:border-accent";
const labelCls = "mb-1.5 block text-[12.5px] font-semibold text-muted";

const TRANSMISSIONS = ["Automatic", "Manual", "CVT", "Other"];
const FUELS = ["Petrol", "Octane", "Diesel", "Hybrid", "Electric", "CNG", "LPG"];
const ACCIDENT_OPTIONS = [
  { value: AccidentStatus.NONE_FOUND, label: "No accident history" },
  { value: AccidentStatus.ONE_INCIDENT, label: "One incident recorded" },
  { value: AccidentStatus.NOT_CHECKED, label: "Not checked yet" },
];

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-dim">{hint}</span>}
    </label>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4 rounded-2xl border border-border bg-card p-[22px]">
      <h2 className="mb-4 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ListingForm() {
  const [state, action, pending] = useActionState<CreateListingResult, FormData>(
    createListing,
    {},
  );
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [videoName, setVideoName] = useState<string | null>(null);

  return (
    <form action={action}>
      <SectionCard title="Car details">
        <div className="mb-3.5">
          <Field label="Listing title" hint="Shown at the top of your listing.">
            <input
              name="title"
              required
              placeholder="e.g. 2019 Toyota Axio Hybrid — single owner"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="mb-3.5 grid gap-3.5 sm:grid-cols-2">
          <Field label="Make">
            <input name="make" required placeholder="Toyota" className={inputCls} />
          </Field>
          <Field label="Model">
            <input name="model" required placeholder="Axio" className={inputCls} />
          </Field>
        </div>

        <div className="mb-3.5 grid gap-3.5 sm:grid-cols-3">
          <Field label="Manufacture year">
            <input
              name="manufactureYear"
              required
              inputMode="numeric"
              placeholder="2019"
              className={inputCls}
            />
          </Field>
          <Field label="Mileage (km)">
            <input
              name="mileageKm"
              required
              inputMode="numeric"
              placeholder="52000"
              className={inputCls}
            />
          </Field>
          <Field label="Engine (cc)">
            <input
              name="engineCc"
              inputMode="numeric"
              placeholder="1500"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-3">
          <Field label="Transmission">
            <select name="transmission" defaultValue="Automatic" className={inputCls}>
              {TRANSMISSIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fuel type">
            <select name="fuelType" defaultValue="Petrol" className={inputCls}>
              {FUELS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Colour">
            <input name="color" placeholder="Pearl white" className={inputCls} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Location & price">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Location (city)">
            <input name="location" required placeholder="Dhaka" className={inputCls} />
          </Field>
          <Field label="Asking price (BDT)">
            <input
              name="priceBdt"
              required
              inputMode="numeric"
              placeholder="e.g. ৳20,50,000"
              className={inputCls}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Registration details">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="BRTA registration number">
            <input
              name="registrationNumber"
              required
              placeholder="DHAKA METRO-GA 11-1234"
              className={inputCls}
            />
          </Field>
          <Field label="Registration year" hint="Optional — if different from the model year.">
            <input
              name="registrationYear"
              inputMode="numeric"
              placeholder="2020"
              className={inputCls}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Condition">
        <div className="mb-3.5">
          <Field label="Accident history">
            <select name="accidentStatus" defaultValue={AccidentStatus.NOT_CHECKED} className={inputCls}>
              {ACCIDENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="Condition notes"
          hint="Service history, tyres, dents, interior, anything a buyer should know."
        >
          <textarea
            name="conditionNotes"
            required
            rows={5}
            placeholder="Well maintained, full service history at Navana, new tyres in 2024, minor scratch on rear bumper…"
            className={`${inputCls} resize-y leading-[1.6]`}
          />
        </Field>
      </SectionCard>

      <SectionCard title="Photos">
        <p className="mb-3 text-[13px] leading-[1.6] text-muted">
          Add up to {MAX_PHOTOS} photos — exterior angles, interior, engine bay, tyres and
          any damage. The first photo becomes the cover image. JPG, PNG or WebP, up to
          6&nbsp;MB each.
        </p>
        <input
          type="file"
          name="photos"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS);
            setPhotoPreviews(files.map((f) => URL.createObjectURL(f)));
          }}
          className="block w-full cursor-pointer rounded-[9px] border border-dashed border-border bg-bg px-3.5 py-3 text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-accent hover:file:text-on-accent"
        />
        {photoPreviews.length > 0 && (
          <>
            <p className="mt-3 text-[12px] text-dim">{photoPreviews.length} selected</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {photoPreviews.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt={`Photo ${i + 1}`}
                  className="h-16 w-20 rounded-md border border-border object-cover"
                />
              ))}
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard title="360° / walkaround video">
        <p className="mb-3 text-[13px] leading-[1.6] text-muted">
          Optional but recommended: a short 360° spin or walkaround clip so buyers can see
          the car in motion. MP4, WebM, MOV or MKV, up to 40&nbsp;MB.
        </p>
        <input
          type="file"
          name="video360"
          accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
          onChange={(e) => setVideoName(e.target.files?.[0]?.name ?? null)}
          className="block w-full cursor-pointer rounded-[9px] border border-dashed border-border bg-bg px-3.5 py-3 text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-accent hover:file:text-on-accent"
        />
        {videoName && (
          <p className="mt-3 text-[12px] text-dim">Selected: {videoName}</p>
        )}
      </SectionCard>

      <SectionCard title="Auction sheet">
        <p className="mb-3 text-[13px] leading-[1.6] text-muted">
          Upload the car&apos;s original auction sheet (the inspection grade sheet).
          The admin team reviews it before your listing goes live. Accepted formats:
          JPG, PNG, WebP or PDF, up to 5&nbsp;MB.
        </p>
        <input
          type="file"
          name="auctionSheet"
          required
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="block w-full cursor-pointer rounded-[9px] border border-dashed border-border bg-bg px-3.5 py-3 text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-accent hover:file:text-on-accent"
        />
      </SectionCard>

      {state.error && (
        <p className="mb-3 rounded-xl border border-[#f0d0c8] bg-[#fdecea] px-4 py-3 text-[13px] font-semibold text-[#c1442d]">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[10px] bg-accent px-6 py-3 text-sm font-bold text-on-accent transition hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Submitting…" : "Submit for review"}
        </button>
        <span className="text-[12px] text-dim">
          You&apos;ll be able to track its status on your seller dashboard.
        </span>
      </div>
    </form>
  );
}
