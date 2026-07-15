import { prisma } from "@/lib/prisma";
import { ContainerStatus } from "@/generated/prisma/enums";

export type OpenContainer = {
  id: string;
  originPort: string;
  destinationPort: string;
  departureDate: string;
  openSlots: number;
};

/**
 * Open slots are derived, never stored: capacity - bookings. Capacity is the
 * admin-editable containerCapacity setting (agreed: 10), with the container's
 * own capacity column winning when it differs.
 */
export async function listOpenContainers(defaultCapacity: number): Promise<OpenContainer[]> {
  const containers = await prisma.container.findMany({
    where: { status: ContainerStatus.OPEN, departureDate: { gt: new Date() } },
    orderBy: { departureDate: "asc" },
    include: { _count: { select: { bookings: true } } },
  });

  return containers
    .map((c) => ({
      id: c.id,
      originPort: c.originPort,
      destinationPort: c.destinationPort,
      departureDate: c.departureDate.toISOString(),
      openSlots: Math.max(0, (c.capacity || defaultCapacity) - c._count.bookings),
    }))
    .filter((c) => c.openSlots > 0);
}

/** The soonest container with room — what the bidding screen previews. */
export async function openContainerFor(defaultCapacity: number): Promise<OpenContainer | null> {
  const open = await listOpenContainers(defaultCapacity);
  return open[0] ?? null;
}
