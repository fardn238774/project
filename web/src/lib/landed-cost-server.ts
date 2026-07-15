import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { num } from "@/lib/format";
import { computeLandedCost, type LandedCostInput, type LandedCost } from "@/lib/landed-cost";

/** Highest band whose ccMin the engine clears; ccMax null = open-ended top band. */
export async function dutyRateFor(engineCc: number): Promise<number> {
  const bands = await prisma.dutyRate.findMany({ orderBy: { ccMin: "asc" } });
  const match = bands
    .filter((b) => engineCc >= b.ccMin && (b.ccMax === null || engineCc <= b.ccMax))
    .at(-1);
  // No band configured for this engine — charge nothing rather than guess.
  return match ? num(match.ratePercent) : 0;
}

/** Loads settings + the duty band, then runs the shared pure calculation. */
export async function landedCostFor(
  input: LandedCostInput & { engineCc: number },
): Promise<LandedCost> {
  const [settings, dutyRatePercent] = await Promise.all([
    getSettings(),
    dutyRateFor(input.engineCc),
  ]);
  return computeLandedCost(input, settings, dutyRatePercent);
}
