import { FeeType } from "@/generated/prisma/enums";

/**
 * Unified landed cost — pure, so the bidding screen can recompute it on the
 * client as the live bid moves without a round-trip. Server-side loaders live
 * in landed-cost-server.ts; keep this file free of prisma imports.
 *
 * Documented simplifications (agreed — see web/README.md):
 * - Duty comes from an admin-editable band table keyed on engine CC only, and
 *   is applied to (bid + shipping) as a CIF approximation; insurance is not
 *   modelled separately.
 * - Shipping and port handling are flat admin-editable settings, not formulas.
 * - Vehicle age is not a duty modifier; it is a hard eligibility gate.
 */
export type AgentFee = { feeType: FeeType; feeValue: number };

export type LandedCostInput = {
  bidJpy: number;
  rate: number;
  agent: AgentFee | null;
  /** Container pooling discounts shipping only. */
  pooled: boolean;
};

/** The subset of platform settings the calculation needs. */
export type LandedCostSettings = {
  shippingFlatBdt: number;
  portHandlingBdt: number;
  poolingDiscountPercent: number;
};

export type LandedCost = {
  bidBdt: number;
  duty: number;
  dutyRatePercent: number;
  shipping: number;
  shippingBeforeDiscount: number;
  agentFee: number;
  agentFeeLabel: string;
  port: number;
  total: number;
};

export function agentFeeFor(agent: AgentFee | null, bidBdt: number) {
  if (!agent) return { amount: 0, label: "No agent selected" };
  if (agent.feeType === FeeType.FLAT) return { amount: agent.feeValue, label: "flat" };
  return { amount: (bidBdt * agent.feeValue) / 100, label: `${agent.feeValue}% of bid` };
}

export function computeLandedCost(
  input: LandedCostInput,
  settings: LandedCostSettings,
  dutyRatePercent: number,
): LandedCost {
  const bidBdt = input.bidJpy * input.rate;

  const shippingBeforeDiscount = settings.shippingFlatBdt;
  const shipping = input.pooled
    ? shippingBeforeDiscount * (1 - settings.poolingDiscountPercent / 100)
    : shippingBeforeDiscount;

  // CIF approximation: duty applies to the goods value plus freight.
  const duty = ((bidBdt + shipping) * dutyRatePercent) / 100;

  const fee = agentFeeFor(input.agent, bidBdt);
  const port = settings.portHandlingBdt;

  return {
    bidBdt,
    duty,
    dutyRatePercent,
    shipping,
    shippingBeforeDiscount,
    agentFee: fee.amount,
    agentFeeLabel: fee.label,
    port,
    total: bidBdt + duty + shipping + fee.amount + port,
  };
}
