import type { MoviesListCrawlSnapshot } from "@/lib/crawlTypes";
import { absolutePageUrl } from "@/lib/siteMetadata";

/** Server HTML — λίστα ταινιών για crawlers στη σελίδα /movies. */
export default function MoviesCrawlableList({ h1, intro, movies }: MoviesListCrawlSnapshot) {
  if (!movies.length) {
    return (
      <div id="seo-crawl-shell" className="seo-crawl-shell border-b border-border/40 bg-muted/20 py-8">
        <div className="container max-w-7xl">
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">{h1}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{intro}</p>
        </div>
      </div>
    );
  }

  return (
    <div id="seo-crawl-shell" className="seo-crawl-shell border-b border-border/40 bg-muted/20 py-8 md:py-10">
      <div className="container max-w-7xl">
        <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">{h1}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{intro}</p>
        <ul className="mt-6 grid list-none gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {movies.map((m) => (
            <li key={m.slug}>
              <a
                href={absolutePageUrl(m.href)}
                className="text-sm font-medium text-foreground underline decoration-foreground/20 underline-offset-2 hover:decoration-foreground/45"
              >
                {m.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
