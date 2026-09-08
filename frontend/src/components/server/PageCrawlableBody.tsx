import HomeCrawlableBody from "@/components/server/HomeCrawlableBody";
import type { SeoCrawlSnapshot } from "@/lib/crawlTypes";
import { absolutePageUrl } from "@/lib/siteMetadata";

/** Server HTML για crawlers - κάθε δημόσια σελίδα (sr-only μέσω critical CSS). */
export default function PageCrawlableBody({ data }: { data: SeoCrawlSnapshot }) {
  if (data.kind === "home" && data.home) {
    const hasContent =
      data.home.today.length > 0 ||
      data.home.week.length > 0 ||
      data.home.summer.length > 0 ||
      data.home.summerVenues.length > 0;
    if (hasContent) return <HomeCrawlableBody data={data.home} />;
  }

  return (
    <div id="seo-crawl-shell" className="seo-crawl-shell border-b border-border/40 bg-muted/20 py-8 md:py-10">
      <div className="container max-w-7xl">
        <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">{data.h1}</h1>
        {data.intro ? (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{data.intro}</p>
        ) : null}
        {data.body ? (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{data.body}</p>
        ) : null}
        {data.scheduleHeading ? (
          <>
            <h2 className="mt-6 font-display text-lg font-semibold text-foreground">{data.scheduleHeading}</h2>
            {data.schedule && data.schedule.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground">
                {data.schedule.map((row) => (
                  <li key={row.label}>{row.label}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Δεν υπάρχουν καταχωρημένες επερχόμενες ημερομηνίες.</p>
            )}
          </>
        ) : null}
        {data.links.length > 0 ? (
          <ul className="mt-6 grid list-none gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {data.links.map((link) => (
              <li key={link.href}>
                <a
                  href={absolutePageUrl(link.href)}
                  className="text-sm font-medium text-foreground underline decoration-foreground/20 underline-offset-2 hover:decoration-foreground/45"
                >
                  {link.title}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
