import type { DetailCrawlSnapshot } from "@/lib/crawlTypes";
import { absolutePageUrl } from "@/lib/siteMetadata";

/** Server HTML - λεπτομέρεια ταινίας/θεάτρου για crawlers (ανεξάρτητα από lazy SPA). */
export default function DetailCrawlableBody({ data }: { data: DetailCrawlSnapshot }) {
  return (
    <div id="seo-crawl-shell" className="seo-crawl-shell border-b border-border/40 bg-muted/20 py-8 md:py-10">
      <div className="container max-w-7xl">
        <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">{data.h1}</h1>
        {data.synopsis ? (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{data.synopsis}</p>
        ) : null}
        <p className="mt-2 text-sm">
          <a
            href={absolutePageUrl(data.href)}
            className="font-medium text-foreground underline decoration-foreground/25 underline-offset-2"
          >
            Σελίδα {data.kind === "movie" ? "ταινίας" : "παράστασης"}
          </a>
        </p>
        <h2 className="mt-6 font-display text-lg font-semibold text-foreground">{data.scheduleHeading}</h2>
        {data.schedule.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground">
            {data.schedule.map((row) => (
              <li key={`${row.datetime}-${row.venueName}-${row.label}`}>{row.label}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {data.kind === "movie"
              ? "Δεν υπάρχουν καταχωρημένες επερχόμενες προβολές."
              : "Δεν υπάρχουν καταχωρημένες επερχόμενες εμφανίσεις."}
          </p>
        )}
      </div>
    </div>
  );
}
