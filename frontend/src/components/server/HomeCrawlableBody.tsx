import type { HomeCrawlSnapshot } from "@/lib/crawlTypes";
import { moviesSectionPath } from "@/lib/moviesFilterPaths";
import { absolutePageUrl } from "@/lib/siteMetadata";

function CrawlMovieList({ title, eyebrow, movies, moreHref }: {
  title: string;
  eyebrow?: string;
  movies: HomeCrawlSnapshot["today"];
  moreHref?: string;
}) {
  if (!movies.length) return null;
  return (
    <section className="seo-crawl-section border-b border-white/10 py-8 md:py-10">
      <div className="container max-w-7xl">
        {eyebrow ? (
          <p className="mb-2 font-body text-[10px] uppercase tracking-[0.22em] text-white/55">{eyebrow}</p>
        ) : null}
        <h2 className="font-display text-xl font-bold text-white md:text-2xl">{title}</h2>
        <ul className="mt-4 grid list-none gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {movies.map((m) => (
            <li key={m.slug}>
              <a href={absolutePageUrl(m.href)} className="text-sm text-white/85 underline decoration-white/25 underline-offset-2 hover:text-white">
                {m.title}
              </a>
            </li>
          ))}
        </ul>
        {moreHref ? (
          <p className="mt-4">
            <a href={absolutePageUrl(moreHref)} className="text-xs font-medium uppercase tracking-wide text-amber-200/90 hover:text-amber-100">
              Περισσότερες ταινίες
            </a>
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** Server HTML — πλούσιο crawlable περιεχόμενο αρχικής (κρύβεται μετά hydrate). */
export default function HomeCrawlableBody({ data }: { data: HomeCrawlSnapshot }) {
  const hasContent =
    data.today.length > 0 || data.week.length > 0 || data.summer.length > 0 || data.summerVenues.length > 0;
  if (!hasContent) return null;

  return (
    <div id="seo-crawl-shell" className="seo-crawl-shell section-black">
      <CrawlMovieList
        eyebrow="Σήμερα"
        title="Ταινίες σήμερα στα σινεμά"
        movies={data.today}
        moreHref={moviesSectionPath("today")}
      />
      <CrawlMovieList
        eyebrow="Εβδομάδα"
        title="Ταινίες εβδομάδας κινηματογράφου"
        movies={data.week}
        moreHref={moviesSectionPath("week")}
      />
      <CrawlMovieList
        eyebrow="Καλοκαίρι"
        title="Θερινές προβολές"
        movies={data.summer}
        moreHref={moviesSectionPath("summer")}
      />
      {data.summerVenues.length > 0 ? (
        <section className="seo-crawl-section border-b border-white/10 py-8 md:py-10">
          <div className="container max-w-7xl">
            <p className="mb-2 font-body text-[10px] uppercase tracking-[0.22em] text-white/55">Χώροι</p>
            <h2 className="font-display text-xl font-bold text-white md:text-2xl">Θερινά σινεμά — πρόγραμμα</h2>
            <ul className="mt-4 grid list-none gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.summerVenues.map((v) => (
                <li key={v.slug}>
                  <a
                    href={absolutePageUrl(v.href)}
                    className="text-sm text-white/85 underline decoration-white/25 underline-offset-2 hover:text-white"
                  >
                    {v.name}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              <a href={absolutePageUrl("/venues")} className="text-xs font-medium uppercase tracking-wide text-amber-200/90 hover:text-amber-100">
                Όλοι οι χώροι
              </a>
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
