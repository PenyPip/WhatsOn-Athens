/** Placeholder πλέγματος ταινιών — header/φίλτρα μένουν ορατά. */
export default function MoviesGridSkeleton({ sections = 1 }: { sections?: number }) {
  return (
    <div className="space-y-10" aria-hidden="true">
      {Array.from({ length: sections }, (_, sectionIdx) => (
        <section
          key={sectionIdx}
          className="rounded-xl border border-border/15 bg-muted/20 p-4 ring-1 ring-border/[0.06] md:p-5"
        >
          <div className="mb-4 h-7 w-36 animate-pulse rounded bg-[#1C1D62]/10 md:mb-5" />
          <div className="mb-4 h-3 w-56 animate-pulse rounded bg-[#1C1D62]/8 md:mb-5" />
          <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }, (_, cardIdx) => (
              <div
                key={cardIdx}
                className="overflow-hidden rounded-lg bg-muted/30 ring-1 ring-border/[0.1]"
              >
                <div className="aspect-[2/3] w-full animate-pulse bg-[#1C1D62]/10" />
                <div className="space-y-2 px-2.5 py-3">
                  <div className="h-3 w-full animate-pulse rounded bg-[#1C1D62]/10" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-[#1C1D62]/8" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
