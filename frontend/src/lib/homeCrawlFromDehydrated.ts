import type { DehydratedState } from "@tanstack/react-query";
import type { StrapiMovie } from "@/lib/api";
import type { HomeCrawlSnapshot } from "@/lib/crawlTypes";
import { queryDataByKey, showtimesFromDehydrated, venuesFromDehydrated } from "@/lib/dehydratedQuery";
import { buildHomeCrawlData } from "@/lib/homeCrawlData";

/** Crawl snapshot από ήδη prefetched state — χωρίς δεύτερο API round-trip στο build. */
export function buildHomeCrawlFromDehydrated(state: DehydratedState): HomeCrawlSnapshot | null {
  const movies = queryDataByKey<StrapiMovie[]>(state, "movies") ?? [];
  const showtimes = showtimesFromDehydrated(state);
  const venues = venuesFromDehydrated(state);
  if (!movies.length && !showtimes.length) return null;
  return buildHomeCrawlData(movies, showtimes, venues);
}
