import { AccidentStatus, ListingStatus } from "@/generated/prisma/client";

/**
 * The prototype's verification/accident pills. Colours are fixed rather than
 * theme-driven — the tinted backgrounds are meaningful (green = good, amber =
 * caution, grey = unknown) and must stay legible in both themes.
 */
const TONE = {
  good: { bg: "#e8f5ee", color: "#1e6b42" },
  warn: { bg: "#fdf3e3", color: "#8a5b12" },
  unknown: { bg: "#efeee9", color: "#6f6a60" },
  bad: { bg: "#fdecea", color: "#c1442d" },
} as const;

type Tone = keyof typeof TONE;

export function Pill({
  tone,
  children,
  size = "sm",
}: {
  tone: Tone;
  children: React.ReactNode;
  size?: "sm" | "md";
}) {
  const { bg, color } = TONE[tone];
  return (
    <span
      className={
        size === "sm"
          ? "rounded-md px-[7px] py-[3px] text-[10.5px]"
          : "rounded-[7px] px-2.5 py-[5px] text-xs"
      }
      style={{ background: bg, color }}
    >
      {children}
    </span>
  );
}

export function verifiedPill(ownershipVerified: boolean) {
  return ownershipVerified
    ? ({ tone: "good", label: "Verified Ownership" } as const)
    : ({ tone: "unknown", label: "Verification Pending" } as const);
}

export function accidentPill(status: AccidentStatus) {
  switch (status) {
    case AccidentStatus.NONE_FOUND:
      return { tone: "good", label: "Accident: None Found" } as const;
    case AccidentStatus.ONE_INCIDENT:
      return { tone: "warn", label: "1 Incident Recorded" } as const;
    default:
      return { tone: "unknown", label: "Accident: Not Checked" } as const;
  }
}

export function listingStatusPill(status: ListingStatus) {
  switch (status) {
    case ListingStatus.ACTIVE:
      return { tone: "good", label: "Active" } as const;
    case ListingStatus.OFFER_RECEIVED:
      return { tone: "warn", label: "Offer received" } as const;
    case ListingStatus.SOLD:
      return { tone: "unknown", label: "Sold" } as const;
    case ListingStatus.REJECTED:
      return { tone: "bad", label: "Rejected" } as const;
    default:
      return { tone: "warn", label: "Pending review" } as const;
  }
}
