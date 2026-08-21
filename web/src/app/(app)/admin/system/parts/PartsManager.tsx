"use client";

import { useState } from "react";
import { bdt } from "@/lib/format";
import { CATEGORY_LABEL } from "@/lib/parts";
import type { PartCategory } from "@/generated/prisma/enums";
import {
  createPart,
  updatePart,
  deletePart,
  addPartPhotos,
  removePartPhoto,
  addPartVideos,
  removePartVideo,
} from "@/lib/system-parts-actions";
import {
  ActionForm,
  DeleteButton,
  Field,
  PhotoManager,
  SectionToggle,
  SelectField,
  VideoManager,
} from "../_ui";

export type Part = {
  id: string;
  name: string;
  brand: string;
  category: string;
  priceBdt: number;
  brtaLegal: boolean;
  boltPattern: string | null;
  offsetMm: number | null;
  photoUrls: string[];
  videoUrls: string[];
  fits: string[];
};
export type ChassisOpt = { chassisCode: string; label: string };

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label }));

function catLabel(c: string) {
  return CATEGORY_LABEL[c as PartCategory] ?? c;
}

function PartFields({ part, chassisOptions }: { part?: Part; chassisOptions: ChassisOpt[] }) {
  return (
    <>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Field label="Part name" name="name" defaultValue={part?.name} placeholder='Rays TE37 18"' required />
        <Field label="Brand" name="brand" defaultValue={part?.brand} placeholder="Rays" required />
        <SelectField label="Category" name="category" defaultValue={part?.category ?? "WHEELS"} options={CATEGORY_OPTIONS} />
        <Field label="Price (BDT)" name="priceBdt" defaultValue={part?.priceBdt} placeholder="185000" required />
        <Field label="Bolt pattern" name="boltPattern" defaultValue={part?.boltPattern ?? ""} placeholder="5x114.3 (wheels only)" />
        <Field label="Offset (ET)" name="offsetMm" defaultValue={part?.offsetMm ?? ""} placeholder="40" />
      </div>

      <label className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-text">
        <input
          type="checkbox"
          name="brtaLegal"
          value="true"
          defaultChecked={part ? part.brtaLegal : true}
          className="accent-[var(--accent)]"
        />
        BRTA-legal for road use
      </label>

      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.03em] text-dim">
          Fits these cars (chassis)
        </p>
        <div className="flex flex-wrap gap-2">
          {chassisOptions.map((c) => (
            <label
              key={c.chassisCode}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-[12px] text-text"
            >
              <input
                type="checkbox"
                name="chassis"
                value={c.chassisCode}
                defaultChecked={part?.fits.includes(c.chassisCode) ?? false}
                className="accent-[var(--accent)]"
              />
              {c.label}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

function PartRow({ part, chassisOptions }: { part: Part; chassisOptions: ChassisOpt[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="min-w-0 text-left">
          <p className="text-[14.5px] font-bold text-text">
            {open ? "▾ " : "▸ "}
            {part.brand} {part.name}
          </p>
          <p className="text-[12px] text-dim">
            {catLabel(part.category)} · {bdt(part.priceBdt)} · fits {part.fits.length} ·{" "}
            {part.photoUrls.length} photos · {part.videoUrls.length} videos
            {part.brtaLegal ? "" : " · not BRTA-legal"}
          </p>
        </button>
        <DeleteButton
          action={deletePart}
          fields={{ id: part.id }}
          confirmMsg={`Delete "${part.brand} ${part.name}"?`}
        />
      </div>

      {open && (
        <div className="grid gap-3.5 border-t border-track p-4">
          <ActionForm action={updatePart} submitLabel="Save part" hidden={{ id: part.id }}>
            <PartFields part={part} chassisOptions={chassisOptions} />
          </ActionForm>
          <PhotoManager addAction={addPartPhotos} removeAction={removePartPhoto} idField="partId" id={part.id} photoUrls={part.photoUrls} />
          <VideoManager addAction={addPartVideos} removeAction={removePartVideo} idField="partId" id={part.id} videoUrls={part.videoUrls} />
        </div>
      )}
    </div>
  );
}

export function PartsManager({
  parts,
  chassisOptions,
}: {
  parts: Part[];
  chassisOptions: ChassisOpt[];
}) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="grid gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {parts.length} {parts.length === 1 ? "part" : "parts"} in the catalog.
        </p>
        <SectionToggle open={adding} onClick={() => setAdding((v) => !v)}>
          Add part
        </SectionToggle>
      </div>

      {adding && (
        <ActionForm action={createPart} submitLabel="Add part" resetOnSuccess className="rounded-xl border border-dashed border-border bg-card p-4">
          <PartFields chassisOptions={chassisOptions} />
          <p className="mt-2 text-[11.5px] text-dim">After adding, open the part to upload photos and videos.</p>
        </ActionForm>
      )}

      {parts.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-5 text-[13px] text-dim">No parts yet.</p>
      ) : (
        parts.map((p) => <PartRow key={p.id} part={p} chassisOptions={chassisOptions} />)
      )}
    </div>
  );
}
