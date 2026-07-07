import type { StrapiMovie, StrapiShowtime, StrapiVenue } from "@/lib/api";
import type { HomeCrawlSnapshot, CrawlMovieRow, CrawlVenueRow } from "@/lib/crawlTypes";
import {
  enrichMoviesWithShowtimeGenre,
  moviesForUpcomingCinemaWeek,
  moviesFromUpcomingShowtimes,
  moviesWithShowtimeToday,
  moviesWithSummerOutdoorShowtimeThisCinemaWeek,
  summerVenuesWithShowtimesOrAll,
} from "@/lib/homeMovieFilters";
import { moviesVenueProgramPath } from "@/lib/moviesVenuePath";

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

export function buildHomeCrawlData(
  movies: StrapiMovie[],
  showtimes: StrapiShowtime[],
  venues: StrapiVenue[],
): HomeCrawlSnapshot {
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
