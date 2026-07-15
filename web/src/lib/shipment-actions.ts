"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, currentBuyer } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { ContainerStatus, Role } from "@/generated/prisma/enums";
import { STAGE_ORDER } from "@/lib/shipment";

export type ShipmentResult = { error?: string; ok?: boolean };

/**
 * Advances a shipment one stage and records a real ShipmentEvent.
 *
 * Only an admin can move a shipment: stage changes are operational facts about
 * the physical car, not something a buyer should be able to assert. The
 * prototype's "Simulate: advance stage" button was buyer-facing.
 */
export async function advanceShipment(shipmentId: string): Promise<ShipmentResult> {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) {
    return { error: "Only an admin can update a shipment stage." };
  }

  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) return { error: "That shipment no longer exists." };

  const next = STAGE_ORDER[STAGE_ORDER.indexOf(shipment.stage) + 1];
  if (!next) return { error: "This shipment is already at the final stage." };

  await prisma.$transaction([
    prisma.shipment.update({ where: { id: shipmentId }, data: { stage: next } }),
    prisma.shipmentEvent.create({ data: { shipmentId, stage: next } }),
  ]);

  revalidatePath("/shipment", "layout");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Books a slot on a shared container. Pooling is offered after a win, per the
 * FR — the bidding screen only previews the discount.
 */
export async function joinContainer(
  shipmentId: string,
  containerId: string,
): Promise<ShipmentResult> {
  const buyer = await currentBuyer();
  if (!buyer) return { error: "Only buyer accounts can book container slots." };

  const settings = await getSettings();

  try {
    await prisma.$transaction(
      async (tx) => {
        const shipment = await tx.shipment.findUnique({ where: { id: shipmentId } });
        if (!shipment) throw new Error("That shipment no longer exists.");
        if (shipment.buyerId !== buyer.id) throw new Error("That is not your shipment.");

        const container = await tx.container.findUnique({
          where: { id: containerId },
          include: { _count: { select: { bookings: true } } },
        });
        if (!container) throw new Error("That container no longer exists.");
        if (container.status !== ContainerStatus.OPEN) {
          throw new Error("That container is no longer open.");
        }

        const capacity = container.capacity || settings.containerCapacity;
        if (container._count.bookings >= capacity) {
          throw new Error("That container just filled up.");
        }

        await tx.containerBooking.create({
          data: { containerId, buyerId: buyer.id, shipmentId },
        });

        // Close the container once the last slot goes.
        if (container._count.bookings + 1 >= capacity) {
          await tx.container.update({
            where: { id: containerId },
            data: { status: ContainerStatus.FULL },
          });
        }
      },
      // Serializable: two buyers racing for the last slot must not both win it.
      { isolationLevel: "Serializable" },
    );
  } catch (err) {
    const message =
      err instanceof Error && err.message.length < 120
        ? err.message
        : "That slot was taken while you were booking — try another container.";
    return { error: message };
  }

  revalidatePath("/shipment", "layout");
  revalidatePath("/escrow", "layout");
  return { ok: true };
}
