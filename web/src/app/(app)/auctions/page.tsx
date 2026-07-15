import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { feeLabel, ratingLabel } from "@/lib/agents";
import { OrgStatus, type Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Choose an agent — AutoBD" };

/**
 * The prototype draws these three chips as `cursor:default` decorations.
 * Implemented as real sort orders — same visual, actual behaviour.
 */
const SORTS = {
  rating: { label: "Sort: Rating", orderBy: { ratingAvg: "desc" } },
  turnaround: { label: "Turnaround", orderBy: { avgTurnaroundDays: "asc" } },
  fee: { label: "Fee", orderBy: { feeValue: "asc" } },
} satisfies Record<string, { label: string; orderBy: Prisma.OrganizationOrderByWithRelationInput }>;

type SortKey = keyof typeof SORTS;

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const active: SortKey = sort && sort in SORTS ? (sort as SortKey) : "rating";

  // Only admin-approved agents are selectable — the screen's core promise.
  const agents = await prisma.organization.findMany({
    where: { status: OrgStatus.APPROVED },
    orderBy: [SORTS[active].orderBy, { companyName: "asc" }],
  });

  return (
    <main className="mx-auto w-full max-w-[1180px] px-10 pb-20 pt-6">
      <h1 className="mb-2 text-[30px] font-extrabold tracking-[-0.01em] text-text">
        Choose a licensed bidding organization
      </h1>
      <p className="mb-7 max-w-[640px] text-[15px] text-muted">
        Every agent below is admin-approved and license-verified. Compare track record, fees,
        and turnaround before you commit to one for your auction search.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {(Object.keys(SORTS) as SortKey[]).map((key) => {
          const on = key === active;
          return (
            <Link
              key={key}
              href={key === "rating" ? "/auctions" : `/auctions?sort=${key}`}
              className={`rounded-[20px] px-3.5 py-2 text-[13px] ${
                on
                  ? "bg-ink font-semibold text-white"
                  : "border border-border bg-card text-muted hover:text-text"
              }`}
            >
              {SORTS[key].label}
            </Link>
          );
        })}
      </div>

      {agents.length === 0 ? (
        <p className="text-[14px] text-muted">
          No agents have been approved yet. An admin approves organizations from the admin
          dashboard.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((a) => {
            const rating = ratingLabel(a.ratingAvg);
            return (
              <div key={a.id} className="rounded-2xl border border-border bg-card p-[22px]">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="mb-1 text-[17px] font-bold text-text">{a.companyName}</p>
                    <p className="text-xs font-bold text-[#2f8f5f]">Licensed &amp; Verified</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[15px] font-bold text-text">
                      {rating ? `★ ${rating}` : "Not yet rated"}
                    </p>
                    <p className="text-xs text-dim">
                      {a.ratingCount} {a.ratingCount === 1 ? "review" : "reviews"}
                    </p>
                  </div>
                </div>

                <div className="mb-3.5 grid grid-cols-3 gap-2 border-y border-track py-3.5">
                  <Stat value={a.successfulImports.toLocaleString("en-US")} label="Imports" />
                  <Stat
                    value={a.avgTurnaroundDays === null ? "—" : `${a.avgTurnaroundDays}d`}
                    label="Avg turnaround"
                  />
                  <Stat value={feeLabel(a.feeType, a.feeValue)} label="Agent fee" />
                </div>

                <Link
                  href={`/auctions/agents/${a.id}`}
                  className="block rounded-[9px] bg-ink py-2.75 text-center text-sm font-semibold text-white transition hover:bg-accent hover:text-on-accent"
                >
                  View Profile
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-base font-bold text-text">{value}</p>
      <p className="text-[11px] uppercase tracking-[0.03em] text-dim">{label}</p>
    </div>
  );
}
