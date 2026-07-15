import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { feeLabel, ratingLabel } from "@/lib/agents";
import { OrgStatus } from "@/generated/prisma/client";

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const agent = await prisma.organization.findUnique({
    where: { id },
    include: {
      ratings: {
        where: { comment: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
  // An unapproved agent must not be reachable by guessing the URL.
  if (!agent || agent.status !== OrgStatus.APPROVED) notFound();

  const rating = ratingLabel(agent.ratingAvg);

  return (
    <main className="mx-auto w-full max-w-[900px] px-10 pb-30 pt-6">
      <Link href="/auctions" className="mb-4.5 block text-[13px] text-muted hover:text-text">
        &larr; Back to all agents
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="mb-1.5 text-[30px] font-extrabold leading-[1.2] text-text">
            {agent.companyName}
          </h1>
          <p className="text-[13px] font-bold text-[#2f8f5f]">
            {`Licensed & Verified · ${agent.yearsInOperation} years in operation`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[26px] font-extrabold text-text">
            {rating ? `★ ${rating}` : "Not yet rated"}
          </p>
          <p className="text-xs text-dim">
            {agent.ratingCount} verified {agent.ratingCount === 1 ? "review" : "reviews"}
          </p>
        </div>
      </div>

      <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat value={agent.successfulImports.toLocaleString("en-US")} label="Successful imports" />
        <Stat
          value={agent.avgTurnaroundDays === null ? "—" : `${agent.avgTurnaroundDays} days`}
          label="Avg turnaround"
        />
        <Stat value={feeLabel(agent.feeType, agent.feeValue)} label="Fee structure" />
        <Stat value={agent.licenseNumber} label="License no." />
      </div>

      {agent.about && (
        <p className="mb-7 text-[15px] leading-[1.7] text-text">{agent.about}</p>
      )}

      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.04em] text-dim">
        Recent buyer ratings
      </h2>
      <div className="mb-4 grid gap-2.5">
        {agent.ratings.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
            No written reviews yet. Buyers can rate this agent after an import completes.
          </p>
        ) : (
          agent.ratings.map((t) => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-4">
              <p className="mb-2 text-sm leading-[1.5] text-text">&ldquo;{t.comment}&rdquo;</p>
              <div className="flex flex-wrap gap-2">
                <ScoreChip label="Communication" score={t.communication} />
                <ScoreChip label="Grading accuracy" score={t.gradingAccuracy} />
                <ScoreChip label="Timeliness" score={t.timeliness} />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 flex justify-center border-t border-border bg-card px-10 py-4">
        <Link
          href={`/auctions/agents/${agent.id}/sessions`}
          className="rounded-[11px] bg-accent px-8 py-3.5 text-[15px] font-bold text-on-accent shadow-[0_4px_14px_rgba(var(--accent-rgb),0.3)] transition hover:bg-accent-hover"
        >
          {`Select ${agent.companyName} & choose auction →`}
        </Link>
      </div>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xl font-extrabold text-text">{value}</p>
      <p className="text-[11px] uppercase text-dim">{label}</p>
    </div>
  );
}

function ScoreChip({ label, score }: { label: string; score: number }) {
  return (
    <span className="rounded-md bg-chip px-2 py-[3px] text-[11px] text-muted">
      {label} ★{score}
    </span>
  );
}
