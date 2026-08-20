"use client";

import { useActionState } from "react";
import Link from "next/link";
import { valueCar, type ValueResult } from "@/lib/value-actions";
import { bdt, bdtLakh } from "@/lib/format";

const inputCls =
  "w-full rounded-[9px] border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none focus:border-accent";
const labelCls = "mb-1.5 block text-[12.5px] font-semibold text-muted";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

function pct(n: number) {
  const s = Math.round(n * 100);
  return `${s > 0 ? "+" : ""}${s}%`;
}

export function ValueMyCarForm() {
  const [state, action, pending] = useActionState<ValueResult, FormData>(valueCar, {});

  return (
    <>
      {state.ok && state.estimateBdt !== undefined && (
        <section className="mb-6 rounded-2xl border border-accent/40 bg-[linear-gradient(180deg,rgba(var(--accent-rgb),0.08),var(--card-bg))] p-[22px]">
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-dim">
            Estimated market value
          </p>
          <p className="mt-1 text-[34px] font-extrabold leading-none text-accent">
            {bdtLakh(state.estimateBdt)}
          </p>
          <p className="mt-1.5 text-[13px] text-muted">
            Likely range {bdtLakh(state.lowBdt!)} – {bdtLakh(state.highBdt!)}
          </p>

          <div className="mt-4 rounded-xl border border-border bg-card p-4">
            <p className="mb-1 text-[12px] text-muted">
              Anchored on <span className="font-bold text-text">{state.marketCount}</span> live{" "}
              {state.make} {state.model} listings on Bikroy — average{" "}
              <span className="font-bold text-text">{bdtLakh(state.marketAvgBdt!)}</span> (range{" "}
              {bdtLakh(state.marketMinBdt!)}–{bdtLakh(state.marketMaxBdt!)}).
            </p>
            {state.breakdown && state.breakdown.length > 0 && (
              <div className="mt-2.5 grid gap-1.5">
                {state.breakdown.map((b) => (
                  <div key={b.label} className="flex items-center justify-between text-[13px]">
                    <span className="text-text">{b.label}</span>
                    <span
                      className={`font-bold ${b.deltaPct >= 0 ? "text-[#2f8f5f]" : "text-[#c1442d]"}`}
                    >
                      {pct(b.deltaPct)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="mt-3 text-[11px] text-dim">
            A market estimate from live classifieds data, adjusted for your car&apos;s details —
            not a formal valuation. Actual offers depend on inspection.
          </p>
          <Link
            href="/used-cars/seller/new"
            className="mt-3 inline-block rounded-[9px] bg-accent px-4 py-2.5 text-[13px] font-bold text-on-accent transition hover:bg-accent-hover"
          >
            List your car at this price &rarr;
          </Link>
        </section>
      )}

      <form action={action} className="rounded-2xl border border-border bg-card p-[22px]">
        <div className="mb-3.5 grid gap-3.5 sm:grid-cols-2">
          <Field label="Make">
            <input name="make" required placeholder="Toyota" className={inputCls} />
          </Field>
          <Field label="Model">
            <input name="model" required placeholder="Axio" className={inputCls} />
          </Field>
        </div>

        <div className="mb-3.5 grid gap-3.5 sm:grid-cols-3">
          <Field label="Manufacture / reg. year">
            <input name="year" required inputMode="numeric" placeholder="2018" className={inputCls} />
          </Field>
          <Field label="Mileage (km)">
            <input name="mileage" required inputMode="numeric" placeholder="62000" className={inputCls} />
          </Field>
          <Field label="Registered city">
            <input name="city" placeholder="Dhaka" className={inputCls} />
          </Field>
        </div>

        <div className="mb-3.5 grid gap-3.5 sm:grid-cols-2">
          <Field label="Accident history">
            <select name="accident" defaultValue="none" className={inputCls}>
              <option value="none">No accident history</option>
              <option value="minor">Minor accident (repaired)</option>
              <option value="major">Major accident</option>
            </select>
          </Field>
          <Field label="Service / maintenance records">
            <select name="maintenance" defaultValue="partial" className={inputCls}>
              <option value="full">Full service records</option>
              <option value="partial">Partial records</option>
              <option value="none">No records</option>
            </select>
          </Field>
        </div>

        <div className="mb-3.5 grid gap-3.5 sm:grid-cols-2">
          <Field label="Past repairs / part replacements">
            <select name="repairs" defaultValue="none" className={inputCls}>
              <option value="none">None / routine wear only</option>
              <option value="minor">Minor parts replaced</option>
              <option value="major">Major repairs (engine/gearbox/suspension)</option>
            </select>
          </Field>
          <Field label="Overall condition">
            <select name="condition" defaultValue="good" className={inputCls}>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
            </select>
          </Field>
        </div>

        {state.error && (
          <p className="mb-3 rounded-xl border border-[#f0d0c8] bg-[#fdecea] px-4 py-3 text-[13px] font-semibold text-[#c1442d]">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-[10px] bg-accent px-6 py-3 text-sm font-bold text-on-accent transition hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Checking the market…" : "Value my car"}
        </button>
      </form>
    </>
  );
}
