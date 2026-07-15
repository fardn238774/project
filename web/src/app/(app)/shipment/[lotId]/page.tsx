import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { currentBuyer } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { listOpenContainers } from "@/lib/containers";
import { STAGE_ORDER, STAGE_LABEL } from "@/lib/shipment";
import { shortDate, daysUntil } from "@/lib/time";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { AdvanceStageButton, JoinContainerButton } from "./ShipmentControls";
import { Role, ShipmentStage } from "@/generated/prisma/enums";

export const metadata = { title: "Shipment tracker — AutoBD" };

export default async function ShipmentPage({
  params,
}: {
  params: Promise<{ lotId: string }>;
}) {
  const [{ lotId }, session, buyer, settings] = await Promise.all([
    params,
    auth(),
    currentBuyer(),
    getSettings(),
  ]);

  const shipment = await prisma.shipment.findUnique({
    where: { auctionCarId: lotId },
    include: {
      auctionCar: true,
      events: { orderBy: { at: "asc" } },
      booking: { include: { container: true } },
    },
  });
  if (!shipment) notFound();

  const isAdmin = session?.user?.role === Role.ADMIN;
  const isOwner = buyer?.id === shipment.buyerId;
  if (!isAdmin && !isOwner) notFound();

  const engagement = await prisma.engagement.findFirst({
    where: { buyerId: shipment.buyerId, auctionCarId: lotId },
    include: { organization: { select: { id: true, companyName: true } } },
    orderBy: { createdAt: "desc" },
  });

  const currentIndex = STAGE_ORDER.indexOf(shipment.stage);
  const delivered = shipment.stage === ShipmentStage.READY_FOR_DELIVERY;

  // First event per stage is the real timestamp for that step.
  const timestampFor = (stage: ShipmentStage) =>
    shipment.events.find((e) => e.stage === stage)?.at ?? null;

  const containers = shipment.booking ? [] : await listOpenContainers(settings.containerCapacity);

  return (
    <main className="mx-auto w-full max-w-[760px] px-10 pb-20 pt-6">
      <h1 className="mb-1.5 text-[26px] font-extrabold text-text">Shipment &amp; import status</h1>
      <p className="mb-6 text-sm text-muted">
        {`${shipment.auctionCar.make} ${shipment.auctionCar.model} — ${shipment.auctionCar.manufactureYear} · Lot ${shipment.auctionCar.lotNumber}${engagement ? ` · ${engagement.organization.companyName}` : ""}`}
      </p>

      <div className="mb-5.5 grid">
        {STAGE_ORDER.map((stage, i) => {
          const done = i <= currentIndex;
          const at = timestampFor(stage);
          const isLast = i === STAGE_ORDER.length - 1;
          return (
            <div key={stage} className="flex gap-3.5">
              <div className="flex flex-col items-center">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full"
                  style={{ background: done ? "var(--accent)" : "var(--track-bg)" }}
                />
                {!isLast && (
                  <span
                    className="min-h-6 w-0.5 flex-1"
                    style={{ background: i < currentIndex ? "var(--accent)" : "var(--track-bg)" }}
                  />
                )}
              </div>
              <div className="pb-5.5">
                <p
                  className={`text-[14.5px] ${done ? "font-bold text-text" : "font-normal text-dim"}`}
                >
                  {STAGE_LABEL[stage]}
                </p>
                <p className="text-xs text-dim">
                  {at
                    ? at.toLocaleString("en-GB", {
                        timeZone: "Asia/Dhaka",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : done
                      ? "—"
                      : "Pending"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <PhotoPlaceholder
        label="Google Maps — live vessel position"
        height={130}
        radius={14}
        tint="green"
        className="mb-4.5"
      />

      <section className="mb-4 rounded-2xl border border-[#cfe3d6] bg-[#f4f9f6] p-5">
        <h2 className="mb-2 text-[13px] font-bold text-[#2f8f5f]">Container Pooling</h2>
        {shipment.booking ? (
          <p className="text-[13.5px] leading-[1.5] text-[#1e4632]">
            {`Booked on the ${shipment.booking.container.originPort}→${shipment.booking.container.destinationPort} container departing ${shortDate(shipment.booking.container.departureDate)}. Shipping was cut by ~${settings.poolingDiscountPercent}%.`}
          </p>
        ) : containers.length === 0 ? (
          <p className="text-[13.5px] leading-[1.5] text-[#1e4632]">
            No container with open slots is departing yet. We&apos;ll offer pooling again as new
            sailings open.
          </p>
        ) : (
          <div className="grid gap-2.5">
            {containers.map((c) => (
              <div key={c.id}>
                <p className="mb-1.5 text-[13.5px] leading-[1.5] text-[#1e4632]">
                  {`${c.openSlots} open ${c.openSlots === 1 ? "slot" : "slots"} · ${c.originPort}→${c.destinationPort} · departs ${shortDate(new Date(c.departureDate))} (in ${daysUntil(new Date(c.departureDate))} days)`}
                </p>
                {isOwner && (
                  <JoinContainerButton
                    shipmentId={shipment.id}
                    containerId={c.id}
                    label={`Join and cut shipping ~${settings.poolingDiscountPercent}%`}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2.5">
        {isAdmin && !delivered && <AdvanceStageButton shipmentId={shipment.id} />}
        {delivered && isOwner && engagement && (
          <Link
            href={`/rating/${lotId}`}
            className="flex-1 rounded-[9px] bg-accent py-3 text-center text-[13px] font-bold text-on-accent"
          >
            Delivered — rate your agent &rarr;
          </Link>
        )}
      </div>

      {delivered && isOwner && (
        <Link
          href={`/modifications?lot=${lotId}`}
          className="mt-4 flex items-center justify-between gap-4 rounded-[14px] border border-[rgba(var(--accent-rgb),0.4)] bg-[linear-gradient(90deg,rgba(var(--accent-rgb),0.12),var(--card-bg))] px-5 py-4"
        >
          <span>
            <span className="mb-0.5 block text-[15px] font-bold text-text">
              Your car has arrived — make it yours
            </span>
            <span className="block text-[13px] text-muted">
              Fitment-checked parts for your exact car, plus the 3D studio.
            </span>
          </span>
          <span className="whitespace-nowrap rounded-[10px] bg-accent px-5 py-2.75 text-[13.5px] font-bold text-on-accent">
            Customize your car &rarr;
          </span>
        </Link>
      )}
    </main>
  );
}
