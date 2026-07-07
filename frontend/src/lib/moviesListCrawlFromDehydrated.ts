import type { DehydratedState } from "@tanstack/react-query";
import type { StrapiMovie, StrapiShowtime, StrapiVenue } from "@/lib/api";
import type { MoviesListCrawlSnapshot } from "@/lib/crawlTypes";
import { SHOWTIMES_CALENDAR_QUERY_KEY, VENUES_PROGRAM_QUERY_KEY } from "@/lib/programQuery";
import { buildMoviesListCrawlData, moviesListCrawlPathAllowed } from "@/lib/moviesListCrawlData";

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
  return [];
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

export function buildMoviesListCrawlFromDehydrated(
  path: string,
  state: DehydratedState,
): MoviesListCrawlSnapshot | null {
  if (!moviesListCrawlPathAllowed(path)) return null;
  const movies = queryData<StrapiMovie[]>(state, "movies") ?? [];
  const showtimes = showtimesFromState(state);
  const venues = venuesFromState(state);
  if (!movies.length && !showtimes.length) return null;
  return buildMoviesListCrawlData(path, movies, showtimes, venues);
}
