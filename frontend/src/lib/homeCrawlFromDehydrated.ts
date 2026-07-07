import type { DehydratedState } from "@tanstack/react-query";
import type { StrapiMovie, StrapiShowtime, StrapiVenue } from "@/lib/api";
import type { HomeCrawlSnapshot, CrawlMovieRow, CrawlVenueRow } from "@/lib/crawlTypes";
import { SHOWTIMES_CALENDAR_QUERY_KEY, VENUES_PROGRAM_QUERY_KEY } from "@/lib/programQuery";
import {
  enrichMoviesWithShowtimeGenre,
  moviesForUpcomingCinemaWeek,
  moviesFromUpcomingShowtimes,
  moviesWithShowtimeToday,
  moviesWithSummerOutdoorShowtimeThisCinemaWeek,
  summerVenuesWithShowtimesOrAll,
} from "@/lib/homeMovieFilters";
import { moviesVenueProgramPath } from "@/lib/moviesVenuePath";

function queryData<T>(state: DehydratedState, key: string): T | undefined {
  const entry = state.queries.find((q) => Array.isArray(q.queryKey) && q.queryKey[0] === key);
  if (!entry || entry.state.status !== "success") return undefined;
  return entry.state.data as T;
}

function showtimesFromState(state: DehydratedState): StrapiShowtime[] {
  const calendar = state.queries.find(
    (q) => JSON.stringify(q.queryKey) === JSON.stringify(SHOWTIMES_CALENDAR_QUERY_KEY),
  );
  if (calendar?.state.status === "success" && Array.isArray(calendar.state.data)) {
    return calendar.state.data as StrapiShowtime[];
  }
  return queryData<StrapiShowtime[]>(state, "showtimes") ?? [];
}

function toMovieRow(m: StrapiMovie): CrawlMovieRow {
  return {
    slug: m.slug,
    title: m.title?.trim() || m.originalTitle?.trim() || m.slug,
    href: `/movies/${m.slug}`,
  };
}

function uniqueMovieRows(movies: StrapiMovie[], limit: number): CrawlMovieRow[] {
  const seen = new Set<string>();
  const out: CrawlMovieRow[] = [];
  for (const m of movies) {
    const slug = m.slug?.trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(toMovieRow(m));
    if (out.length >= limit) break;
  }
  return out;
}

function venuesFromState(state: DehydratedState): StrapiVenue[] {
  const program = state.queries.find(
    (q) => JSON.stringify(q.queryKey) === JSON.stringify(VENUES_PROGRAM_QUERY_KEY),
  );
  if (program?.state.status === "success" && Array.isArray(program.state.data)) {
    return program.state.data as StrapiVenue[];
  }
  return queryData<StrapiVenue[]>(state, "venues") ?? [];
}

/** Crawl snapshot από ήδη prefetched state — χωρίς δεύτερο API round-trip στο build. */
export function buildHomeCrawlFromDehydrated(state: DehydratedState): HomeCrawlSnapshot | null {
  const movies = queryData<StrapiMovie[]>(state, "movies") ?? [];
  const showtimes = showtimesFromState(state);
  const venues = venuesFromState(state);
  if (!movies.length && !showtimes.length) return null;

  const now = new Date();
  const enriched = enrichMoviesWithShowtimeGenre(movies, showtimes);
  const catalog = enriched.length ? enriched : moviesFromUpcomingShowtimes([], showtimes);
  const summerVenueList = venues.length
    ? summerVenuesWithShowtimesOrAll(venues, showtimes, now)
    : [];

  return {
    today: uniqueMovieRows(moviesWithShowtimeToday(catalog, showtimes, now), 36),
    week: uniqueMovieRows(moviesForUpcomingCinemaWeek(catalog, showtimes, now), 36),
    summer: uniqueMovieRows(moviesWithSummerOutdoorShowtimeThisCinemaWeek(catalog, showtimes, venues, now), 30),
    summerVenues: summerVenueList.slice(0, 24).map(
      (v): CrawlVenueRow => ({
        slug: v.slug,
        name: v.name,
        href: moviesVenueProgramPath(v.slug),
      }),
    ),
  };
}
