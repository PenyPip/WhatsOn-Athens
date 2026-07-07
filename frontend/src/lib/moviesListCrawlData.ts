import type { StrapiMovie, StrapiShowtime, StrapiVenue } from "@/lib/api";
import type { MoviesListCrawlSnapshot, CrawlMovieRow } from "@/lib/crawlTypes";
import {
  enrichMoviesWithShowtimeGenre,
  mergeMovieWithShowtimeFields,
  movieStubFromShowtime,
  moviesComingAfterUpcomingCinemaWeek,
  moviesFromUpcomingShowtimes,
  moviesReleasedInLastDays,
  moviesWithShowtimeToday,
  moviesWithShowtimesInUpcomingCinemaWeek,
  showtimeIsUpcoming,
  showtimeMatchesHomeSummerCinemaRow,
  showtimeMatchesHomeToday,
  showtimeMatchesHomeUpcomingCinemaWeek,
} from "@/lib/homeMovieFilters";
import { parseMoviesFilterPath } from "@/lib/moviesFilterPaths";
import { moviesAreaSeo, moviesGenreSeo, moviesSectionSeo } from "@/lib/moviesFilterSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";

function toRow(m: StrapiMovie): CrawlMovieRow {
  return {
    slug: m.slug,
    title: m.title?.trim() || m.originalTitle?.trim() || m.slug,
    href: `/movies/${m.slug}`,
  };
}

function uniqueRows(movies: StrapiMovie[], limit = 48): CrawlMovieRow[] {
  const seen = new Set<string>();
  const out: CrawlMovieRow[] = [];
  for (const m of movies) {
    const slug = m.slug?.trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(toRow(m));
    if (out.length >= limit) break;
  }
  return out;
}

function moviesFromFilteredShowtimes(
  moviesEnriched: StrapiMovie[],
  showtimes: StrapiShowtime[],
  predicate: (st: StrapiShowtime) => boolean,
): StrapiMovie[] {
  const now = new Date();
  const map = new Map<number, StrapiMovie>();
  for (const m of moviesEnriched) map.set(m.id, m);

  const out: StrapiMovie[] = [];
  const seen = new Set<number>();

  for (const st of showtimes) {
    if (!showtimeIsUpcoming(st, now) || !predicate(st)) continue;
    let movie: StrapiMovie | null = null;
    if (st.movieId != null) {
      const hit = map.get(Number(st.movieId));
      movie = hit ? mergeMovieWithShowtimeFields(hit, st) : null;
    }
    if (!movie && st.movieSlug) {
      const bySlug = moviesEnriched.find((m) => m.slug === st.movieSlug);
      movie = bySlug ? mergeMovieWithShowtimeFields(bySlug, st) : movieStubFromShowtime(st.movieSlug, st);
    }
    if (!movie || seen.has(movie.id)) continue;
    seen.add(movie.id);
    out.push(movie);
  }
  return out;
}

export function moviesListCrawlPathAllowed(path: string): boolean {
  const normalized = path === "" ? "/" : path.startsWith("/") ? path : `/${path}`;
  if (!normalized.startsWith("/movies")) return false;
  if (/^\/movies\/[^/]+\/[^/]+/.test(normalized)) return false;
  if (/^\/movies\/venue\//.test(normalized)) return false;
  const slugTail = normalized.replace(/^\/movies\/?/, "");
  if (
    slugTail &&
    !["today", "week", "summer", "new", "soon"].includes(slugTail.split("/")[0]) &&
    !slugTail.startsWith("genre/") &&
    !slugTail.startsWith("area/")
  ) {
    return false;
  }
  return true;
}

function seoCopyForMoviesPath(path: string): { h1: string; intro: string } {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const filters = parseMoviesFilterPath(normalized);
  let h1: string = staticPageSeo.movies.title;
  let intro: string = staticPageSeo.movies.description;
  if (filters.section) {
    const seo = moviesSectionSeo(filters.section);
    h1 = seo.h1;
    intro = seo.intro ?? seo.description;
  } else if (filters.genreSlug) {
    const seo = moviesGenreSeo(filters.genreSlug);
    h1 = seo.h1;
    intro = seo.description;
  } else if (filters.area) {
    const seo = moviesAreaSeo(filters.area);
    h1 = seo.h1;
    intro = seo.description;
  }
  return { h1, intro };
}

export function buildMoviesListCrawlData(
  path: string,
  movies: StrapiMovie[],
  showtimes: StrapiShowtime[],
  venues: StrapiVenue[],
): MoviesListCrawlSnapshot {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const { h1, intro } = seoCopyForMoviesPath(normalized);
  const filters = parseMoviesFilterPath(normalized);
  const section = filters.section;
  const area = filters.area;
  const genreSlug = filters.genreSlug;
  const now = new Date();
  const enriched = enrichMoviesWithShowtimeGenre(movies, showtimes);
  const catalog = enriched.length ? enriched : moviesFromUpcomingShowtimes([], showtimes);

  let list: StrapiMovie[] = [];

  if (section === "new") {
    list = moviesReleasedInLastDays(catalog, 10, showtimes, venues, now);
  } else if (section === "soon") {
    list = moviesComingAfterUpcomingCinemaWeek(catalog, showtimes, venues, now);
  } else if (section === "week") {
    list = moviesWithShowtimesInUpcomingCinemaWeek(catalog, showtimes, now);
  } else if (section === "today") {
    list = moviesWithShowtimeToday(catalog, showtimes, now);
  } else if (section === "summer") {
    list = moviesFromFilteredShowtimes(catalog, showtimes, (st) =>
      showtimeMatchesHomeSummerCinemaRow(st, venues, now),
    );
  } else {
    list = moviesWithShowtimeToday(catalog, showtimes, now);
    if (!list.length) {
      list = moviesFromFilteredShowtimes(catalog, showtimes, (st) =>
        showtimeMatchesHomeUpcomingCinemaWeek(st, now),
      );
    }
  }

  if (genreSlug) {
    const g = genreSlug.toLowerCase();
    list = list.filter(
      (m) => m.genreSlugs?.some((s) => s.toLowerCase() === g) || m.genreSlug?.toLowerCase() === g,
    );
  }

  if (area === "athens") {
    list = moviesFromFilteredShowtimes(list.length ? list : catalog, showtimes, (st) => {
      const v = venues.find((x) => x.id === st.venueId || x.slug === st.venueSlug);
      return v?.city?.toLowerCase() === "athens" || v?.city?.toLowerCase() === "αθήνα";
    });
  } else if (area === "thessaloniki") {
    list = moviesFromFilteredShowtimes(list.length ? list : catalog, showtimes, (st) => {
      const v = venues.find((x) => x.id === st.venueId || x.slug === st.venueSlug);
      return v?.city?.toLowerCase() === "thessaloniki" || v?.city?.toLowerCase() === "θεσσαλονίκη";
    });
  }

  if (!list.length && section === "today") {
    list = moviesFromFilteredShowtimes(catalog, showtimes, (st) => showtimeMatchesHomeToday(st, now));
  }

  return { h1, intro, movies: uniqueRows(list) };
}
