import { ShipmentStage } from "@/generated/prisma/enums";

/**
 * Pure shipment constants. These live outside shipment-actions.ts because a
 * "use server" file may only export async functions — exporting an array or a
 * record from one fails the production build.
 */

/** Ordered pipeline — the tracker renders this, and advanceShipment walks it. */
export const STAGE_ORDER: ShipmentStage[] = [
  ShipmentStage.WIN_CONFIRMED,
  ShipmentStage.PAYMENT_RECEIVED,
  ShipmentStage.COLLECTED_JP,
  ShipmentStage.VESSEL_DEPARTED,
  ShipmentStage.IN_TRANSIT,
  ShipmentStage.ARRIVED_CTG,
  ShipmentStage.CUSTOMS_CLEARANCE,
  ShipmentStage.READY_FOR_DELIVERY,
];

export const STAGE_LABEL: Record<ShipmentStage, string> = {
  WIN_CONFIRMED: "Win confirmed",
  PAYMENT_RECEIVED: "Payment received",
  COLLECTED_JP: "Collected at Japanese yard",
  VESSEL_DEPARTED: "Vessel departed",
  IN_TRANSIT: "In transit",
  ARRIVED_CTG: "Arrived at Chattogram",
  CUSTOMS_CLEARANCE: "Customs clearance",
  READY_FOR_DELIVERY: "Ready for delivery",
};
