"use client";

import { useState } from "react";
import {
  createAuction,
  updateAuction,
  deleteAuction,
  setAuctionBroadcast,
  createLot,
  updateLot,
  deleteLot,
  addLotPhotos,
  removeLotPhoto,
  addLotVideos,
  removeLotVideo,
} from "@/lib/system-recon-actions";
import {
  ActionForm,
  DeleteButton,
  Field,
  PhotoManager,
  SectionToggle,
  SelectField,
  VideoManager,
} from "../_ui";

export type Lot = {
  id: string;
  lotNumber: string;
  make: string;
  model: string;
  manufactureYear: number;
  mileageKm: number;
  engineCc: number;
  grade: string;
  chassisCode: string | null;
  startingPriceJpy: number;
  reservePriceJpy: number | null;
  durationSeconds: number;
  status: string;
  photoUrls: string[];
  videoUrls: string[];
};

export type Auction = {
  id: string;
  house: string;
  location: string;
  startsAtValue: string; // for the datetime-local input
  startsAtLabel: string;
  status: string;
  broadcastUrl: string | null;
  broadcastKind: string;
  lots: Lot[];
};

const AUCTION_STATUS_OPTIONS = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "LIVE", label: "Live" },
  { value: "ENDED", label: "Ended" },
];

const STATUS_TONE: Record<string, string> = {
  SCHEDULED: "bg-chip text-dim",
  LIVE: "bg-[#fdf3e3] text-[#8a5b12]",
  ENDED: "bg-[#efeee9] text-[#6f6a60]",
};

const LOT_TONE: Record<string, string> = {
  PENDING: "bg-chip text-dim",
  LIVE: "bg-[#fdf3e3] text-[#8a5b12]",
  SOLD: "bg-[#e8f5ee] text-[#1e6b42]",
  NO_SALE: "bg-[#fdecea] text-[#c1442d]",
};

function Badge({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`shrink-0 rounded-md px-2 py-[3px] text-[10.5px] font-bold ${tone}`}>{label}</span>
  );
}

// ---------------------------------------------------------------- lots

function LotFields({ lot }: { lot?: Lot }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <Field label="Lot number" name="lotNumber" defaultValue={lot?.lotNumber} placeholder="A-102" required />
      <Field label="Auction grade" name="grade" defaultValue={lot?.grade} placeholder="4.5" required />
      <Field label="Make" name="make" defaultValue={lot?.make} placeholder="Toyota" required />
      <Field label="Model" name="model" defaultValue={lot?.model} placeholder="Aqua" required />
      <Field label="Manufacture year" name="manufactureYear" defaultValue={lot?.manufactureYear} placeholder="2021" required />
      <Field label="Mileage (km)" name="mileageKm" defaultValue={lot?.mileageKm} placeholder="30000" required />
      <Field label="Engine (cc)" name="engineCc" defaultValue={lot?.engineCc} placeholder="1500" required />
      <Field label="Chassis code" name="chassisCode" defaultValue={lot?.chassisCode ?? ""} placeholder="NHP10" />
      <Field label="Starting price (JPY)" name="startingPriceJpy" defaultValue={lot?.startingPriceJpy} placeholder="900000" required />
      <Field label="Reserve price (JPY)" name="reservePriceJpy" defaultValue={lot?.reservePriceJpy ?? ""} placeholder="optional" />
      <Field label="Bidding duration (seconds)" name="durationSeconds" defaultValue={lot?.durationSeconds ?? 120} placeholder="120" required />
    </div>
  );
}

function LotRow({ lot }: { lot: Lot }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
        <button type="button" onClick={() => setOpen((v) => !v)} className="min-w-0 text-left">
          <p className="flex items-center gap-2 text-[13.5px] font-bold text-text">
            <span>
              {open ? "▾ " : "▸ "}Lot {lot.lotNumber} · {lot.manufactureYear} {lot.make} {lot.model}
            </span>
            <Badge label={lot.status} tone={LOT_TONE[lot.status] ?? "bg-chip text-dim"} />
          </p>
          <p className="text-[11.5px] text-dim">
            Grade {lot.grade} · ¥{lot.startingPriceJpy.toLocaleString("en-US")} start · {lot.photoUrls.length} photos ·{" "}
            {lot.videoUrls.length} videos
          </p>
        </button>
        <DeleteButton action={deleteLot} fields={{ id: lot.id }} confirmMsg={`Delete lot ${lot.lotNumber}?`} />
      </div>

      {open && (
        <div className="grid gap-3 border-t border-track p-3.5">
          <ActionForm action={updateLot} submitLabel="Save lot" hidden={{ id: lot.id }}>
            <LotFields lot={lot} />
          </ActionForm>
          <PhotoManager addAction={addLotPhotos} removeAction={removeLotPhoto} idField="lotId" id={lot.id} photoUrls={lot.photoUrls} />
          <VideoManager addAction={addLotVideos} removeAction={removeLotVideo} idField="lotId" id={lot.id} videoUrls={lot.videoUrls} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- auctions

function AuctionFields({ a }: { a?: Auction }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <Field label="Auction house" name="house" defaultValue={a?.house} placeholder="USS Yokohama" required />
      <Field label="Location" name="location" defaultValue={a?.location} placeholder="Yokohama, Japan" required />
      <Field label="Starts at" name="startsAt" type="datetime-local" defaultValue={a?.startsAtValue} required />
      {a && <SelectField label="Status" name="status" defaultValue={a.status} options={AUCTION_STATUS_OPTIONS} />}
    </div>
  );
}

function AuctionCard({ auction }: { auction: Auction }) {
  const [editing, setEditing] = useState(false);
  const [addingLot, setAddingLot] = useState(false);
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[17px] font-extrabold text-text">
            <span>{auction.house}</span>
            <Badge label={auction.status} tone={STATUS_TONE[auction.status] ?? "bg-chip text-dim"} />
          </p>
          <p className="text-[12.5px] text-dim">
            {auction.location} · {auction.startsAtLabel} · {auction.lots.length}{" "}
            {auction.lots.length === 1 ? "lot" : "lots"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button type="button" onClick={() => setEditing((v) => !v)} className="text-[12.5px] font-bold text-accent hover:underline">
            {editing ? "Close" : "Edit"}
          </button>
          <DeleteButton
            action={deleteAuction}
            fields={{ id: auction.id }}
            confirmMsg={`Delete auction "${auction.house}" and all its lots?`}
          />
        </div>
      </div>

      {editing && (
        <div className="mt-4 grid gap-3">
          <ActionForm action={updateAuction} submitLabel="Save auction" hidden={{ id: auction.id }} className="rounded-xl border border-border bg-bg p-4">
            <AuctionFields a={auction} />
          </ActionForm>
          <ActionForm action={setAuctionBroadcast} submitLabel="Save telecast" hidden={{ auctionId: auction.id }} className="rounded-xl border border-border bg-bg p-4">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.03em] text-dim">Live telecast video</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Field label="Stream / YouTube URL" name="url" defaultValue={auction.broadcastUrl ?? ""} placeholder="https://youtube.com/…" />
              <SelectField
                label="Type"
                name="kind"
                defaultValue={auction.broadcastKind}
                options={[
                  { value: "VIDEO", label: "Video (.mp4 stream)" },
                  { value: "YOUTUBE", label: "YouTube" },
                ]}
              />
            </div>
          </ActionForm>
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.03em] text-dim">
          Cars in this auction ({auction.lots.length})
        </p>
        <div className="grid gap-2">
          {auction.lots.length === 0 ? (
            <p className="text-[13px] text-dim">No lots yet — add the first car below.</p>
          ) : (
            auction.lots.map((l) => <LotRow key={l.id} lot={l} />)
          )}
        </div>
        <div className="mt-3">
          <SectionToggle open={addingLot} onClick={() => setAddingLot((v) => !v)}>
            Add car / lot
          </SectionToggle>
        </div>
        {addingLot && (
          <ActionForm action={createLot} submitLabel="Add lot" hidden={{ auctionId: auction.id }} resetOnSuccess className="mt-3 rounded-xl border border-dashed border-border p-4">
            <LotFields />
            <p className="mt-2 text-[11.5px] text-dim">After adding, open the lot to upload photos and videos.</p>
          </ActionForm>
        )}
      </div>
    </section>
  );
}

export function AuctionManager({ auctions }: { auctions: Auction[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {auctions.length} {auctions.length === 1 ? "auction" : "auctions"}.
        </p>
        <SectionToggle open={adding} onClick={() => setAdding((v) => !v)}>
          Add auction
        </SectionToggle>
      </div>

      {adding && (
        <ActionForm action={createAuction} submitLabel="Add auction" resetOnSuccess className="rounded-2xl border border-dashed border-border bg-card p-5">
          <AuctionFields />
          <p className="mt-2 text-[11.5px] text-dim">Create the session, then open it to add cars and a telecast video.</p>
        </ActionForm>
      )}

      {auctions.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-[13px] text-dim">No auctions yet.</p>
      ) : (
        auctions.map((a) => <AuctionCard key={a.id} auction={a} />)
      )}
    </div>
  );
}
