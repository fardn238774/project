"use client";

import { useState, useTransition } from "react";
import {
  createOrg,
  updateOrg,
  deleteOrg,
  setOrgStatus,
} from "@/lib/system-recon-actions";
import { ActionForm, DeleteButton, Field, SectionToggle, SelectField, TextAreaField } from "../_ui";

export type Org = {
  id: string;
  companyName: string;
  licenseNumber: string;
  yearsInOperation: number;
  about: string | null;
  feeType: string;
  feeValue: number;
  successfulImports: number;
  avgTurnaroundDays: number | null;
  status: string;
  logoUrl: string | null;
  email: string;
};

const FEE_OPTIONS = [
  { value: "PERCENT", label: "Percent of bid (%)" },
  { value: "FLAT", label: "Flat fee (BDT)" },
];

const STATUS_TONE: Record<string, string> = {
  APPROVED: "bg-[#e8f5ee] text-[#1e6b42]",
  PENDING: "bg-[#fdf3e3] text-[#8a5b12]",
  SUSPENDED: "bg-[#efeee9] text-[#6f6a60]",
  REJECTED: "bg-[#fdecea] text-[#c1442d]",
};

function OrgFields({ org }: { org?: Org }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <Field label="Company name" name="companyName" defaultValue={org?.companyName} required />
      <Field label="License number" name="licenseNumber" defaultValue={org?.licenseNumber} required />
      <Field label="Years in operation" name="yearsInOperation" defaultValue={org?.yearsInOperation} placeholder="8" required />
      <SelectField label="Fee type" name="feeType" defaultValue={org?.feeType ?? "PERCENT"} options={FEE_OPTIONS} />
      <Field label="Fee value" name="feeValue" defaultValue={org?.feeValue} placeholder="3 (%) or 45000 (flat)" required />
      <Field label="Successful imports" name="successfulImports" defaultValue={org?.successfulImports ?? 0} />
      <Field label="Avg turnaround (days)" name="avgTurnaroundDays" defaultValue={org?.avgTurnaroundDays ?? ""} placeholder="21" />
      <TextAreaField label="About" name="about" defaultValue={org?.about ?? ""} placeholder="Short profile shown in the directory…" />
    </div>
  );
}

function StatusButtons({ org }: { org: Org }) {
  const [pending, start] = useTransition();
  const act = (decision: string, reason?: string) => {
    const fd = new FormData();
    fd.set("id", org.id);
    fd.set("decision", decision);
    if (reason) fd.set("reason", reason);
    start(async () => void (await setOrgStatus({}, fd)));
  };
  const btn = "rounded-[8px] px-3 py-1.5 text-[12px] font-bold disabled:opacity-50";
  return (
    <div className="flex flex-wrap gap-2">
      {org.status !== "APPROVED" && (
        <button type="button" disabled={pending} onClick={() => act("APPROVE")} className={`${btn} bg-[#2f8f5f] text-white`}>
          Approve
        </button>
      )}
      {org.status !== "SUSPENDED" && (
        <button type="button" disabled={pending} onClick={() => act("SUSPEND")} className={`${btn} bg-chip text-text`}>
          Suspend
        </button>
      )}
      {org.status !== "REJECTED" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => act("REJECT", window.prompt("Reason for rejection (shown to the org)?") ?? undefined)}
          className={`${btn} bg-[#c1442d] text-white`}
        >
          Reject
        </button>
      )}
    </div>
  );
}

function OrgRow({ org }: { org: Org }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="min-w-0 text-left">
          <p className="flex items-center gap-2 text-[14.5px] font-bold text-text">
            <span>{open ? "▾ " : "▸ "}{org.companyName}</span>
            <span className={`shrink-0 rounded-md px-2 py-[3px] text-[10.5px] font-bold ${STATUS_TONE[org.status] ?? "bg-chip text-dim"}`}>
              {org.status}
            </span>
          </p>
          <p className="text-[12px] text-dim">
            License {org.licenseNumber} · {org.yearsInOperation} yrs ·{" "}
            {org.feeType === "PERCENT" ? `${org.feeValue}% fee` : `৳${org.feeValue.toLocaleString("en-IN")} fee`} · {org.email}
          </p>
        </button>
        <DeleteButton
          action={deleteOrg}
          fields={{ id: org.id }}
          confirmMsg={`Delete "${org.companyName}"? This removes its login and profile.`}
        />
      </div>

      {open && (
        <div className="grid gap-3.5 border-t border-track p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12px] font-bold uppercase tracking-[0.03em] text-dim">Status</p>
            <StatusButtons org={org} />
          </div>

          <ActionForm action={updateOrg} submitLabel="Save organization" hidden={{ id: org.id }}>
            <OrgFields org={org} />
            <label className="mt-2.5 block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.03em] text-dim">
                {org.logoUrl ? "Replace logo" : "Add logo"} (optional)
              </span>
              <input
                name="logo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="block w-full text-[12.5px] text-muted file:mr-3 file:rounded-md file:border-0 file:bg-chip file:px-3 file:py-1.5 file:text-[12px] file:font-bold file:text-text"
              />
            </label>
            {org.logoUrl && (
              <div className="mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={org.logoUrl} alt="logo" className="h-14 w-14 rounded-lg border border-border object-cover" />
              </div>
            )}
          </ActionForm>
        </div>
      )}
    </div>
  );
}

export function OrgManager({ orgs }: { orgs: Org[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="grid gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {orgs.length} {orgs.length === 1 ? "organization" : "organizations"}.
        </p>
        <SectionToggle open={adding} onClick={() => setAdding((v) => !v)}>
          Add organization
        </SectionToggle>
      </div>

      {adding && (
        <ActionForm action={createOrg} submitLabel="Add organization" resetOnSuccess className="rounded-xl border border-dashed border-border bg-card p-4">
          <div className="mb-2.5 grid gap-2.5 sm:grid-cols-2">
            <Field label="Login email" name="email" type="email" placeholder="org@example.com" required />
            <Field label="Temporary password" name="password" type="text" placeholder="min 6 characters" required />
          </div>
          <OrgFields />
          <p className="mt-2 text-[11.5px] text-dim">
            Creates an approved bidding-org login. Share the email &amp; temporary password with the
            organization so they can sign in and change it.
          </p>
        </ActionForm>
      )}

      {orgs.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-5 text-[13px] text-dim">
          No organizations yet.
        </p>
      ) : (
        orgs.map((o) => <OrgRow key={o.id} org={o} />)
      )}
    </div>
  );
}
