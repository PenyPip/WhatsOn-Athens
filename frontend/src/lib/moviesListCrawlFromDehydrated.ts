import type { DehydratedState } from "@tanstack/react-query";
import type { StrapiMovie } from "@/lib/api";
import type { MoviesListCrawlSnapshot } from "@/lib/crawlTypes";
import { queryDataByKey, showtimesFromDehydrated, venuesFromDehydrated } from "@/lib/dehydratedQuery";
import { buildMoviesListCrawlData, moviesListCrawlPathAllowed } from "@/lib/moviesListCrawlData";

export function buildMoviesListCrawlFromDehydrated(
  path: string,
  state: DehydratedState,
): MoviesListCrawlSnapshot | null {
  if (!moviesListCrawlPathAllowed(path)) return null;
  const movies = queryDataByKey<StrapiMovie[]>(state, "movies") ?? [];
  const showtimes = showtimesFromDehydrated(state);
  const venues = venuesFromDehydrated(state);
  if (!movies.length && !showtimes.length) return null;
  return buildMoviesListCrawlData(path, movies, showtimes, venues);
}
