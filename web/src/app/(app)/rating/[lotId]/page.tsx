import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireBuyer } from "@/lib/session";
import { RatingForm } from "./RatingForm";
import { DisputeStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Rate your agent — AutoBD" };

export default async function RatingPage({
  params,
}: {
  params: Promise<{ lotId: string }>;
}) {
  const [{ lotId }, buyer] = await Promise.all([params, requireBuyer()]);

  const engagement = await prisma.engagement.findFirst({
    where: { buyerId: buyer.id, auctionCarId: lotId },
    include: { organization: { select: { id: true, companyName: true } } },
    orderBy: { createdAt: "desc" },
  });
  if (!engagement) notFound();

  const [existing, dispute] = await Promise.all([
    prisma.rating.findUnique({
      where: { buyerId_auctionCarId: { buyerId: buyer.id, auctionCarId: lotId } },
    }),
    prisma.dispute.findFirst({
      where: { buyerId: buyer.id, auctionCarId: lotId, status: { not: DisputeStatus.RESOLVED } },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-[640px] px-10 pb-20 pt-6">
      <h1 className="mb-1.5 text-[26px] font-extrabold text-text">
        {`Rate ${engagement.organization.companyName}`}
      </h1>
      <p className="mb-5.5 text-sm text-muted">
        Your import is complete. Ratings feed the agent&apos;s public profile score.
      </p>

      <RatingForm
        auctionCarId={lotId}
        organizationId={engagement.organization.id}
        agentName={engagement.organization.companyName}
        existing={
          existing
            ? {
                communication: existing.communication,
                gradingAccuracy: existing.gradingAccuracy,
                timeliness: existing.timeliness,
                overallValue: existing.overallValue,
                comment: existing.comment,
              }
            : null
        }
        hasOpenDispute={dispute !== null}
      />
    </main>
  );
}
