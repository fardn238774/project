/**
 * Instant navigation feedback. Next renders this the moment a link is clicked,
 * while the destination's server component fetches its data — so a click always
 * shows something immediately instead of freezing on the old page. The header
 * stays put (it lives in the layout); only the page body shows this skeleton.
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-10 pb-20 pt-6">
      <div className="mb-3 h-8 w-64 max-w-full animate-pulse rounded-lg bg-chip" />
      <div className="mb-8 h-4 w-96 max-w-full animate-pulse rounded bg-chip" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 h-24 animate-pulse rounded-lg bg-chip" />
            <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-chip" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-chip" />
          </div>
        ))}
      </div>
    </main>
  );
}
