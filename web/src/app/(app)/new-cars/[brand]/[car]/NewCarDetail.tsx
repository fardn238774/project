"use client";

import { useActionState, useState } from "react";
import { submitInquiry, type InquiryResult } from "@/lib/new-car-actions";
import { reserveTestDrive, type TestDriveResult } from "@/lib/test-drive-actions";
import { DealerMap } from "@/components/DealerMap";

type Variant = {
  id: string;
  name: string;
  price: string;
  engine: string;
  trans: string;
  economy: string;
};
type Dealer = { id: string; name: string; address: string; latitude: number; longitude: number };
type TestDrive = { id: string; dealerName: string; scheduledLabel: string };

export function NewCarDetail({
  newCarId,
  brandName,
  warranty,
  warrantyKm,
  variants,
  dealers,
  isBuyer,
  inquiredVariantIds,
  upcomingTestDrives,
}: {
  newCarId: string;
  brandName: string;
  warranty: string;
  warrantyKm: string;
  variants: Variant[];
  dealers: Dealer[];
  isBuyer: boolean;
  inquiredVariantIds: string[];
  upcomingTestDrives: TestDrive[];
}) {
  const [index, setIndex] = useState(0);
  const [dealerId, setDealerId] = useState(dealers[0]?.id ?? "");
  const [inquiry, inquiryAction, inquiryPending] = useActionState<InquiryResult, FormData>(
    submitInquiry,
    {},
  );
  const [drive, driveAction, drivePending] = useActionState<TestDriveResult, FormData>(
    reserveTestDrive,
    {},
  );

  const selected = variants[index];
  if (!selected) return <p className="text-sm text-muted">No variants listed for this model.</p>;

  const selectedDealer = dealers.find((d) => d.id === dealerId) ?? dealers[0];
  const inquirySent = inquiredVariantIds.includes(selected.id) || inquiry.ok;

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2">
        {variants.map((v, i) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setIndex(i)}
            className={`rounded-[9px] border px-4 py-2.5 text-[13px] font-bold transition ${
              i === index
                ? "border-accent bg-accent text-on-accent"
                : "border-border bg-card text-text hover:border-accent"
            }`}
          >
            {v.name} &middot; {v.price}
          </button>
        ))}
      </div>

      <section className="mb-4.5 rounded-2xl border border-border bg-card p-[22px]">
        <h2 className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          Specifications — {selected.name}
        </h2>
        <div className="grid gap-3 text-sm text-text md:grid-cols-2">
          <p>
            <span className="text-dim">Engine</span> &middot; {selected.engine}
          </p>
          <p>
            <span className="text-dim">Transmission</span> &middot; {selected.trans}
          </p>
          <p>
            <span className="text-dim">Fuel economy</span> &middot; {selected.economy}
          </p>
          <p>
            <span className="text-dim">Warranty</span> &middot; {warranty}, {warrantyKm}
          </p>
        </div>
      </section>

      {/* Dealer picker — drives the map, the inquiry and the test drive together */}
      <section className="mb-4.5 rounded-2xl border border-border bg-card p-[22px]">
        <h2 className="mb-2.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          Nearest {brandName} dealer
        </h2>
        {dealers.length === 0 ? (
          <p className="text-sm text-muted">No dealers listed for this brand yet.</p>
        ) : (
          <>
            {dealers.length > 1 && (
              <select
                value={dealerId}
                onChange={(e) => setDealerId(e.target.value)}
                aria-label="Choose a dealer"
                className="mb-3 w-full rounded-[9px] border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none focus:border-accent"
              >
                {dealers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
            {selectedDealer && (
              <DealerMap
                name={selectedDealer.name}
                address={selectedDealer.address}
                latitude={selectedDealer.latitude}
                longitude={selectedDealer.longitude}
              />
            )}
          </>
        )}
      </section>

      {/* Dealer inquiry (variant-scoped, optional dealer) */}
      {inquirySent ? (
        <p className="mb-4.5 rounded-xl border border-[#cfe3d6] bg-[#f4f9f6] p-4 text-sm font-semibold text-[#2f8f5f]">
          {`Inquiry sent to your nearest ${brandName} dealer partner. They'll contact you within 24 hours.`}
        </p>
      ) : (
        <form action={inquiryAction} className="mb-4.5">
          <input type="hidden" name="variantId" value={selected.id} />
          <input type="hidden" name="dealerId" value={dealerId} />
          <button
            type="submit"
            disabled={inquiryPending || !isBuyer}
            className="w-full rounded-[11px] bg-accent px-4 py-3.5 text-[15px] font-bold text-on-accent transition hover:bg-accent-hover disabled:opacity-60"
          >
            {inquiryPending ? "Sending…" : `Submit dealer inquiry for ${selected.name}`}
          </button>
          {!isBuyer && (
            <p className="mt-2 text-center text-[13px] text-muted">
              Dealer inquiries and test drives are available on buyer accounts.
            </p>
          )}
          {inquiry.error && (
            <p className="mt-2 text-center text-[13px] font-semibold text-accent">
              {inquiry.error}
            </p>
          )}
        </form>
      )}

      {/* Test drive reservation (dealer required) */}
      <section className="rounded-2xl border border-border bg-card p-[22px]">
        <h2 className="mb-1.5 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
          Reserve a test drive
        </h2>
        <p className="mb-3.5 text-[13px] text-muted">
          Pick a branch and a time. You&apos;ll drive the {selected.name} at that dealer.
        </p>

        {(upcomingTestDrives.length > 0 || drive.ok) && (
          <div className="mb-3.5 grid gap-2">
            {drive.ok && drive.scheduledLabel && (
              <p className="rounded-lg border border-[#cfe3d6] bg-[#f4f9f6] px-3 py-2.5 text-[13px] font-semibold text-[#2f8f5f]">
                Test drive reserved for {drive.scheduledLabel}. The dealer will confirm.
              </p>
            )}
            {upcomingTestDrives.map((t) => (
              <p
                key={t.id}
                className="rounded-lg bg-chip px-3 py-2.5 text-[13px] text-text"
              >
                Upcoming: {t.scheduledLabel} · {t.dealerName}
              </p>
            ))}
          </div>
        )}

        {isBuyer && dealers.length > 0 ? (
          <form action={driveAction} className="grid gap-2.5 sm:grid-cols-[1fr_1fr_auto]">
            <input type="hidden" name="newCarId" value={newCarId} />
            <select
              name="dealerId"
              defaultValue={dealerId}
              key={dealerId}
              aria-label="Test drive dealer"
              className="rounded-[9px] border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
            >
              {dealers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              name="scheduledAt"
              aria-label="Test drive date and time"
              className="rounded-[9px] border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={drivePending}
              className="rounded-[9px] bg-ink px-5 py-2.5 text-[13px] font-bold text-white transition hover:bg-accent hover:text-on-accent disabled:opacity-60"
            >
              {drivePending ? "Reserving…" : "Reserve"}
            </button>
          </form>
        ) : (
          <p className="text-[13px] text-muted">
            {isBuyer
              ? "No dealers available to book a test drive yet."
              : "Sign in with a buyer account to reserve a test drive."}
          </p>
        )}
        {drive.error && (
          <p className="mt-2 text-[13px] font-semibold text-accent">{drive.error}</p>
        )}
      </section>
    </>
  );
}
