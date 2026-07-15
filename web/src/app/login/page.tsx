"use client";

import { useActionState, useState } from "react";
import { login, register, type AuthResult } from "@/lib/auth-actions";

type Mode = "login" | "register";
type RoleKey = "BUYER" | "ORGANIZATION" | "ADMIN";

const ROLES: { key: RoleKey; label: string }[] = [
  { key: "BUYER", label: "Buyer" },
  { key: "ORGANIZATION", label: "Bidding Org" },
  { key: "ADMIN", label: "Admin" },
];

const input =
  "w-full rounded-[9px] border border-[#e6e1d6] bg-white px-3.5 py-3 text-sm text-[#211d18] outline-none placeholder:text-[#a39d90] focus:border-[#c1442d]";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<RoleKey>("BUYER");

  const action = mode === "login" ? login : register;
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(action, {});

  const roleLabel = ROLES.find((r) => r.key === role)!.label;

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-10 py-10">
      <div className="mx-auto grid max-w-[1000px] overflow-hidden rounded-[20px] border border-[#e6e1d6] bg-white shadow-[0_12px_44px_rgba(0,0,0,0.08)] md:grid-cols-2">
        {/* brand panel */}
        <div className="relative flex flex-col justify-between overflow-hidden bg-[#1a0d0d] p-10 text-white">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(193,68,45,0.35),transparent_70%)]" />
          <div className="relative">
            <div className="mb-7 text-2xl font-extrabold tracking-tight">
              Auto<span className="text-[#c1442d]">BD</span>
            </div>
            <h1 className="mb-3.5 text-[27px] font-extrabold leading-tight">
              {mode === "login" ? "Welcome back." : "Join AutoBD."}
            </h1>
            <p className="text-sm leading-relaxed text-[#c9c4ba]">
              {mode === "login"
                ? "Sign in to track your imports, bids, and shipments in one place."
                : "Create an account to buy new, used, or reconditioned cars with transparent costs."}
            </p>
          </div>
          <ul className="relative mt-8 grid gap-3.5">
            {[
              "Transparent landed-cost on every car",
              "Licensed, rated bidding organizations",
              "Live Japanese auctions, escrow-protected",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2.5 text-[13.5px] text-[#e2e0d9]">
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-[rgba(193,68,45,0.2)] text-xs text-[#c1442d]">
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* form panel */}
        <div className="bg-white p-10">
          <div className="mb-6 flex gap-1 rounded-[10px] bg-[#f2efe8] p-1">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-2.5 text-[13.5px] font-bold transition ${
                  mode === m ? "bg-white text-[#211d18]" : "text-[#6f6a60]"
                }`}
              >
                {m === "login" ? "Log in" : "Create account"}
              </button>
            ))}
          </div>

          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.05em] text-[#a39d90]">
            I am a
          </div>
          <div className="mb-5 flex gap-1.5">
            {ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRole(r.key)}
                className={`flex-1 rounded-[9px] border px-1 py-2.5 text-[12.5px] font-bold transition ${
                  role === r.key
                    ? "border-[#211d18] bg-[#211d18] text-white"
                    : "border-[#e6e1d6] bg-transparent text-[#6f6a60]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <form action={formAction} className="grid gap-3">
            <input type="hidden" name="role" value={role} />

            {mode === "register" && role === "BUYER" && (
              <>
                <input className={input} name="fullName" placeholder="Full name" required />
                <input className={input} name="phone" placeholder="Phone" required />
              </>
            )}

            {mode === "register" && role === "ORGANIZATION" && (
              <>
                <p className="text-xs text-[#a39d90]">Step 1 of 3 · Company details</p>
                <input className={input} name="companyName" placeholder="Company name" required />
                <input className={input} name="licenseNumber" placeholder="License number" required />
                <input
                  className={input}
                  name="yearsInOperation"
                  type="number"
                  min="0"
                  placeholder="Years of track record"
                  required
                />
                <div className="flex gap-2">
                  <select className={input} name="feeType" defaultValue="PERCENT">
                    <option value="PERCENT">% of bid</option>
                    <option value="FLAT">Flat ৳</option>
                  </select>
                  <input
                    className={input}
                    name="feeValue"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Fee value"
                    required
                  />
                </div>
                <p className="text-xs text-[#a39d90]">
                  Account stays inactive until admin approval.
                </p>
              </>
            )}

            {mode === "register" && role === "ADMIN" ? (
              <p className="rounded-[10px] bg-[#f2efe8] p-4 text-sm text-[#6f6a60]">
                Admin accounts are provisioned internally and cannot self-register.
              </p>
            ) : (
              <>
                <input className={input} name="email" type="email" placeholder="Email" required />
                <input
                  className={input}
                  name="password"
                  type="password"
                  placeholder="Password"
                  required
                />
              </>
            )}

            {state?.error && (
              <p className="rounded-[9px] border border-[#f0c8c2] bg-[#fbeeea] px-3 py-2.5 text-[13px] font-semibold text-[#c1442d]">
                {state.error}
              </p>
            )}

            {!(mode === "register" && role === "ADMIN") && (
              <button
                type="submit"
                disabled={pending}
                className="mt-2 rounded-[10px] bg-[#c1442d] py-3.5 text-sm font-bold text-white transition hover:bg-[#9c3520] disabled:opacity-60"
              >
                {pending
                  ? "Please wait…"
                  : mode === "login"
                    ? `Log in as ${roleLabel}`
                    : "Create account & continue"}
              </button>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
