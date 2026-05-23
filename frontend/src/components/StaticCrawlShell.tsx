import spaPaths from "@/generated/spa-static-paths.json";
import crawlData from "@/generated/spa-crawl-enrichment.json";
import { pathFromSlugParam, seoCopyForPath } from "@/lib/jsonLdPage";
import { moviesGenreHref } from "@/lib/movieGenreLinks";
import { siteSeo } from "@/lib/siteMetadata";

const MAIN_NAV: { href: string; label: string }[] = [
  { href: "/", label: "Αρχική" },
  { href: "/movies", label: "Ταινίες" },
  { href: "/theater", label: "Θέατρο" },
  { href: "/venues", label: "Χώροι" },
  { href: "/dining", label: "Φαγητό" },
  { href: "/reviews", label: "Κριτικές" },
  { href: "/privacy", label: "Απόρρητο & όροι" },
];

const MOVIES_FILTER_LINKS: { href: string; label: string }[] = [
  { href: "/movies?section=today", label: "Ταινίες σήμερα" },
  { href: "/movies?section=summer", label: "Θερινά σινεμά" },
  { href: "/movies?section=new", label: "Νέες ταινίες" },
  { href: "/movies?section=week", label: "Εβδομάδα κινηματογράφου" },
  { href: "/movies?section=soon", label: "Προσεχώς" },
  { href: "/movies?area=athens", label: "Ταινίες Αθήνα" },
  { href: "/movies?area=thessaloniki", label: "Ταινίες Θεσσαλονίκη" },
];

type SpaPathEntry = { slug: string[] };

type CrawlGenre = { slug: string; label: string; href: string };
type CrawlVenue = {
  slug: string;
  name: string;
  address?: string;
  googleMapsUrl?: string;
  moviesHref: string;
  venuesHref: string;
};
type CrawlMovie = { path: string; slug: string; title: string; genreSlugs: string[] };

const enrichment = crawlData as {
  genres: CrawlGenre[];
  venues: CrawlVenue[];
  movies: CrawlMovie[];
};

/**
 * Στατικό περιεχόμενο + εσωτερικοί σύνδεσμοι στο αρχικό HTML (entity-graph, H1, κείμενο).
 * Περιλαμβάνει είδη ταινιών, φίλτρα /movies και Google Maps ανά σινεμά (από build + Strapi).
 * Κρυφό οπτικά (sr-only)· το SPA το αντικαθιστά μετά το hydration.
 */
export default function StaticCrawlShell({ path }: { path: string }) {
  const normalized = path === "" ? "/" : path.startsWith("/") ? path : `/${path}`;
  const { title, description } = seoCopyForPath(normalized);

  const entityPaths = (spaPaths as SpaPathEntry[])
    .map((e) => pathFromSlugParam(e.slug))
    .filter((p) => p !== normalized);

  const pageMovie = enrichment.movies.find((m) => m.path === normalized);
  const isMovieDetail = Boolean(pageMovie);
  const isHome = normalized === "/";
  const isMoviesList = normalized === "/movies";
  const isVenuesList = normalized === "/venues";
  const showGenreNav = isHome || isMoviesList || isMovieDetail;
  const showVenueNav = isHome || isMoviesList || isMovieDetail || isVenuesList;

  const pageGenres = pageMovie
    ? enrichment.genres.filter((g) => pageMovie.genreSlugs.includes(g.slug))
    : [];

  const genreBySlug = new Map(enrichment.genres.map((g) => [g.slug, g]));

  return (
    <div id="static-crawl-shell" className="sr-only">
      <header>
        <p>
          <a href="/">{siteSeo.siteName}</a> — {siteSeo.description}
        </p>
        <nav aria-label="Κύρια πλοήγηση">
          <ul>
            {MAIN_NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main>
        <h2>{title}</h2>
        <p>{description}</p>
        <p>
          Ο οδηγός {siteSeo.siteName} για πρόγραμμα ταινιών, σινεμά και θερινά σινεμά στην Αθήνα και τη
          Θεσσαλονίκη, θεατρικές παραστάσεις, χώρους προβολής και εστιατόρια. Δες ώρες προβολών, αφίσες,
          κριτικές και φίλτρα ανά πόλη, είδος και σινεμά.
        </p>

        {isMovieDetail && pageMovie ? (
          <nav aria-label="Είδος ταινίας">
            <h2>Είδος</h2>
            {pageGenres.length ? (
              <ul>
                {pageGenres.map((g) => (
                  <li key={g.slug}>
                    <a href={g.href}>Όλες οι ταινίες — {g.label}</a>
                  </li>
                ))}
              </ul>
            ) : pageMovie.genreSlugs.length ? (
              <ul>
                {pageMovie.genreSlugs.map((slug) => (
                  <li key={slug}>
                    <a href={moviesGenreHref(slug)}>Όλες οι ταινίες — {slug}</a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                <a href="/movies">Λίστα ταινιών</a>
              </p>
            )}
            <p>
              <a href={pageMovie.path}>{pageMovie.title}</a> · <a href="/movies">Όλες οι ταινίες</a>
            </p>
          </nav>
        ) : null}

        {showGenreNav && enrichment.genres.length > 0 ? (
          <nav aria-label="Φίλτρο είδους ταινίας">
            <h2>Είδη ταινιών</h2>
            <ul>
              {enrichment.genres.map((g) => (
                <li key={g.slug}>
                  <a href={g.href}>{g.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {showVenueNav && enrichment.venues.length > 0 ? (
          <nav aria-label="Σινεμά και χάρτες">
            <h2>Σινεμά — πρόγραμμα και χάρτης</h2>
            <ul>
              {enrichment.venues.map((v) => (
                <li key={v.slug}>
                  <a href={v.moviesHref}>Πρόγραμμα ταινιών — {v.name}</a>
                  {v.googleMapsUrl ? (
                    <>
                      {" · "}
                      <a href={v.googleMapsUrl}>Χάρτης Google — {v.name}</a>
                    </>
                  ) : null}
                  {v.address ? <> — {v.address}</> : null}
                  {" · "}
                  <a href={v.venuesHref}>Όλοι οι χώροι</a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {isMoviesList || isHome ? (
          <nav aria-label="Φίλτρα λίστας ταινιών">
            <h2>Προβολές ανά ημέρα και πόλη</h2>
            <ul>
              {MOVIES_FILTER_LINKS.map((item) => (
                <li key={item.href}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <nav aria-label="Σελίδες περιεχομένου">
          <h2>Όλες οι σελίδες</h2>
          <ul>
            {entityPaths.map((href) => {
              const label = seoCopyForPath(href).title;
              const movie = enrichment.movies.find((m) => m.path === href);
              const genreLinks = movie
                ? movie.genreSlugs
                    .map((s) => genreBySlug.get(s))
                    .filter((g): g is CrawlGenre => Boolean(g))
                : [];
              return (
                <li key={href}>
                  <a href={href}>{label}</a>
                  {genreLinks.length ? (
                    <ul>
                      {genreLinks.map((g) => (
                        <li key={`${href}-${g.slug}`}>
                          <a href={g.href}>{g.label}</a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>

        <footer>
          <p>
            <a href="/privacy">Πολιτική απορρήτου</a> · <a href="/privacy#oroi">Όροι χρήσης</a>
          </p>
          <p>
            Επικοινωνία: <a href="mailto:hello@the37n.gr">hello@the37n.gr</a>
          </p>
        </footer>
      </main>
    </div>
  );
}
