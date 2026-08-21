"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";

/** Shared form building blocks for the System Management manager panels. */

export type ActionResult = { error?: string; ok?: boolean };
export type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

export function Field({
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

export function SelectField({
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

export function TextAreaField({
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

export function ActionForm({
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
  const [state, formAction, pending] = useActionState(action, {} as ActionResult);
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

export function DeleteButton({
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

export function SectionToggle({
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

/** Small "×" overlay button that removes a photo or video via its action. */
export function DeleteMediaButton({
  action,
  fields,
}: {
  action: Action;
  fields: Record<string, string>;
}) {
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

/** A photo grid + multi-file upload form, reused by every media-bearing post. */
export function PhotoManager({
  addAction,
  removeAction,
  idField,
  id,
  photoUrls,
}: {
  addAction: Action;
  removeAction: Action;
  idField: string;
  id: string;
  photoUrls: string[];
}) {
  return (
    <div className="rounded-xl border border-border bg-bg p-3.5">
      <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.03em] text-dim">
        Photos ({photoUrls.length})
      </p>
      {photoUrls.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2.5">
          {photoUrls.map((url) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-16 w-24 rounded-lg border border-border object-cover" />
              <DeleteMediaButton action={removeAction} fields={{ [idField]: id, url }} />
            </div>
          ))}
        </div>
      )}
      <ActionForm action={addAction} submitLabel="Upload photos" hidden={{ [idField]: id }} resetOnSuccess>
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

/** A video grid + multi-file upload form. */
export function VideoManager({
  addAction,
  removeAction,
  idField,
  id,
  videoUrls,
}: {
  addAction: Action;
  removeAction: Action;
  idField: string;
  id: string;
  videoUrls: string[];
}) {
  return (
    <div className="rounded-xl border border-border bg-bg p-3.5">
      <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.03em] text-dim">
        Videos ({videoUrls.length})
      </p>
      {videoUrls.length > 0 && (
        <div className="mb-3 grid gap-2.5 sm:grid-cols-2">
          {videoUrls.map((url) => (
            <div key={url} className="relative">
              <video src={url} controls preload="metadata" className="w-full rounded-lg border border-border bg-black" />
              <DeleteMediaButton action={removeAction} fields={{ [idField]: id, url }} />
            </div>
          ))}
        </div>
      )}
      <ActionForm action={addAction} submitLabel="Upload videos" hidden={{ [idField]: id }} resetOnSuccess>
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
