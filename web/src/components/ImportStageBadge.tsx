import { ShipmentStage } from "@/generated/prisma/enums";
import { STAGE_LABEL, STAGE_ORDER } from "@/lib/shipment";

/**
 * Coloured badge for a shipment's current import stage. The tint ramps from
 * neutral (just started) through blue/amber (collected, in transit) to green
 * (ready for delivery), so the stage reads at a glance on a list. Fixed hex
 * values keep the colour meaningful in both light and dark themes — the same
 * approach as <Pill> in StatusChip.tsx.
 */
const STAGE_STYLE: Record<ShipmentStage, { bg: string; color: string }> = {
  WIN_CONFIRMED: { bg: "#eef1f4", color: "#4a5568" },
  PAYMENT_RECEIVED: { bg: "#eaf0f6", color: "#3f5b78" },
  COLLECTED_JP: { bg: "#ecebfa", color: "#4b46b0" },
  VESSEL_DEPARTED: { bg: "#e6f0fb", color: "#275ea3" },
  IN_TRANSIT: { bg: "#fdf3e3", color: "#8a5b12" },
  ARRIVED_CTG: { bg: "#e3f5f2", color: "#1c7a6b" },
  CUSTOMS_CLEARANCE: { bg: "#f3ecfa", color: "#6b3fa0" },
  READY_FOR_DELIVERY: { bg: "#e8f5ee", color: "#1e6b42" },
};

export function ImportStageBadge({
  stage,
  size = "sm",
  showStep = false,
}: {
  stage: ShipmentStage;
  size?: "sm" | "md";
  showStep?: boolean;
}) {
  const { bg, color } = STAGE_STYLE[stage];
  const step = STAGE_ORDER.indexOf(stage) + 1;
  return (
    <span
      className={
        size === "sm"
          ? "inline-flex items-center gap-1 rounded-md px-[7px] py-[3px] text-[10.5px] font-bold"
          : "inline-flex items-center gap-1.5 rounded-[7px] px-2.5 py-[5px] text-xs font-bold"
      }
      style={{ background: bg, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {STAGE_LABEL[stage]}
      {showStep && <span style={{ opacity: 0.7 }}>{` · ${step}/${STAGE_ORDER.length}`}</span>}
    </span>
  );
}
