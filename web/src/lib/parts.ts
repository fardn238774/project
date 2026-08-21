import type { PartCategory } from "@/generated/prisma/enums";

/**
 * Pure part/fitment types and labels — no prisma import, so client components
 * can use them without dragging the query layer into the browser bundle.
 * Server-side queries live in lib/fitment.ts.
 */
export type CatalogPart = {
  id: string;
  name: string;
  brand: string;
  category: PartCategory;
  priceBdt: number;
  brtaLegal: boolean;
  boltPattern: string | null;
  offsetMm: number | null;
  photoUrls: string[];
  videoUrls: string[];
  /** Chassis codes this part is listed for. */
  fits: string[];
  compatible: boolean;
};

export type GarageCar = {
  id: string;
  label: string;
  chassisCode: string | null;
};

export const CATEGORY_LABEL: Record<PartCategory, string> = {
  WHEELS: "Wheels",
  BODY_KIT: "Body kit",
  INTERIOR: "Interior",
  LIGHTING: "Lighting",
};
