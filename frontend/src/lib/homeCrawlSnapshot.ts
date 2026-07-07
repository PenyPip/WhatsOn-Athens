import { api, type StrapiMovie } from "@/lib/api";
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
    const slug = typeof m.slug === "string" ? m.slug.trim() : "";
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(toMovieRow(m));
    if (out.length >= limit) break;
  }
  return out;
}

/** Πλήρες snapshot για crawlable HTML αρχικής (build-time · ξεχωριστά από slim client bootstrap). */
export async function fetchHomeCrawlSnapshot(): Promise<HomeCrawlSnapshot> {
  const empty: HomeCrawlSnapshot = { today: [], week: [], summer: [], summerVenues: [] };
  try {
    const [movies, showtimes, venues] = await Promise.all([
      api.getMoviesForHome(),
      api.getShowtimesForHome(),
      api.getVenuesForProgram(),
    ]);
    const now = new Date();
    const enriched = enrichMoviesWithShowtimeGenre(movies, showtimes);
    const catalog = enriched.length ? enriched : moviesFromUpcomingShowtimes([], showtimes);

    const summerVenueList = summerVenuesWithShowtimesOrAll(venues, showtimes, now);
    const summerVenues: CrawlVenueRow[] = summerVenueList.slice(0, 24).map((v) => ({
      slug: v.slug,
      name: v.name,
      href: moviesVenueProgramPath(v.slug),
    }));

    return {
      today: uniqueMovieRows(moviesWithShowtimeToday(catalog, showtimes, now), 36),
      week: uniqueMovieRows(moviesForUpcomingCinemaWeek(catalog, showtimes, now), 36),
      summer: uniqueMovieRows(moviesWithSummerOutdoorShowtimeThisCinemaWeek(catalog, showtimes, venues, now), 30),
      summerVenues,
    };
  } catch (err) {
    console.warn("[homeCrawlSnapshot]", err);
    return empty;
  }
}
