import type { DehydratedState } from "@tanstack/react-query";
import type { StrapiMovie, StrapiShowtime, StrapiTheaterPerformance, StrapiTheaterShow, StrapiVenue } from "@/lib/api";
import { crawlEntityByPath } from "@/lib/crawlEnrichment";
import type { DetailCrawlSnapshot, DetailCrawlScheduleRow } from "@/lib/crawlTypes";
import { buildMovieDetailJsonLd } from "@/lib/jsonLdMovieDetail";
import { formatShowtimeShareLabel } from "@/lib/movieShowtimeShare";
import { movieTitleLines } from "@/lib/movieTitles";
import { SHOWTIMES_CALENDAR_QUERY_KEY, THEATER_PERFORMANCES_CALENDAR_QUERY_KEY } from "@/lib/programQuery";
import { showtimeIsUpcoming, formatShowtimeWeekRangeLabel, showtimeIsWeekBlock } from "@/lib/showtimeSchedule";
import { synopsisExcerpt } from "@/lib/synopsisExcerpt";

const SCHEDULE_CAP = 40;

function queryData<T>(state: DehydratedState, match: (key: unknown) => boolean): T | undefined {
  const entry = state.queries.find(
    (q) => Array.isArray(q.queryKey) && match(q.queryKey) && q.state.status === "success",
  );
  if (!entry) return undefined;
  return entry.state.data as T;
}

function movieScheduleRows(showtimes: StrapiShowtime[], limit = SCHEDULE_CAP): DetailCrawlScheduleRow[] {
  const now = new Date();
  const upcoming = showtimes
    .filter((st) => showtimeIsUpcoming(st, now))
    .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime));
  const out: DetailCrawlScheduleRow[] = [];
  for (const st of upcoming) {
    const venueName = (st.venue ?? "").trim() || "Σινεμά";
    let label: string;
    if (showtimeIsWeekBlock(st)) {
      const range = formatShowtimeWeekRangeLabel(st);
      label = range ? `${range} · ${venueName}` : formatShowtimeShareLabel(st.datetime, venueName);
    } else {
      label = formatShowtimeShareLabel(st.datetime, venueName);
    }
    out.push({ label, venueName, datetime: st.datetime });
    if (out.length >= limit) break;
  }
  return out;
}

function theaterScheduleRows(
  performances: StrapiTheaterPerformance[],
  limit = SCHEDULE_CAP,
): DetailCrawlScheduleRow[] {
  const now = new Date();
  const upcoming = performances
    .filter((p) => showtimeIsUpcoming(p, now))
    .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime));
  const out: DetailCrawlScheduleRow[] = [];
  for (const p of upcoming) {
    const venueName = (p.venue ?? "").trim() || "Θέατρο";
    let label: string;
    if (showtimeIsWeekBlock(p)) {
      const range = formatShowtimeWeekRangeLabel(p);
      label = range ? `${range} · ${venueName}` : formatShowtimeShareLabel(p.datetime, venueName);
    } else {
      label = formatShowtimeShareLabel(p.datetime, venueName);
    }
    out.push({ label, venueName, datetime: p.datetime });
    if (out.length >= limit) break;
  }
  return out;
}

export function buildMovieDetailCrawlFromDehydrated(
  path: string,
  state: DehydratedState,
): DetailCrawlSnapshot | null {
  const m = path.match(/^\/movies\/([^/]+)$/);
  const slug = m?.[1]?.trim();
  if (!slug) return null;

  const movie =
    queryData<StrapiMovie>(state, (key) => Array.isArray(key) && key[0] === "movie" && key[1] === slug) ??
    null;
  const enrichment = crawlEntityByPath(path);
  const enriched = enrichment?.kind === "movie" ? enrichment.entity : null;

  const title =
    (movie ? movieTitleLines(movie).primary : "") ||
    enriched?.title?.trim() ||
    slug;
  const synopsis =
    synopsisExcerpt(movie?.synopsis ?? enriched?.synopsis ?? "", 400) ||
    "";

  const showtimes =
    queryData<StrapiShowtime[]>(
      state,
      (key) => Array.isArray(key) && key[0] === "showtimes" && key[1] === SHOWTIMES_CALENDAR_QUERY_KEY[1],
    ) ??
    queryData<StrapiShowtime[]>(state, (key) => Array.isArray(key) && key[0] === "showtimes") ??
    [];
  const forSlug = showtimes.filter((st) => st.movieSlug === slug);
  const schedule = movieScheduleRows(forSlug.length ? forSlug : showtimes.filter((st) => st.movieSlug === slug));

  const venues =
    queryData<StrapiVenue[]>(state, (key) => Array.isArray(key) && key[0] === "venues") ?? [];

  let jsonLd: Record<string, unknown> | null = null;
  if (movie) {
    jsonLd = buildMovieDetailJsonLd({
      movie,
      slug,
      genreLabel: movie.genre ?? enriched?.genreLine ?? "",
      showtimes: forSlug.length ? forSlug : showtimes.filter((st) => st.movieSlug === slug),
      venues,
    });
  }

  return {
    kind: "movie",
    h1: title,
    synopsis,
    href: `/movies/${slug}`,
    scheduleHeading: "Προβολές",
    schedule,
    jsonLd,
  };
}

export function buildTheaterDetailCrawlFromDehydrated(
  path: string,
  state: DehydratedState,
): DetailCrawlSnapshot | null {
  const m = path.match(/^\/theater\/([^/]+)$/);
  const slug = m?.[1]?.trim();
  if (!slug || slug === "kids") return null;

  const show =
    queryData<StrapiTheaterShow>(
      state,
      (key) => Array.isArray(key) && key[0] === "theaterShow" && key[1] === slug,
    ) ?? null;
  const enrichment = crawlEntityByPath(path);
  const enriched = enrichment?.kind === "theater" ? enrichment.entity : null;

  const title = show?.title?.trim() || enriched?.title?.trim() || slug;
  const synopsis = synopsisExcerpt(show?.synopsis ?? enriched?.synopsis ?? "", 400);

  const performances =
    queryData<StrapiTheaterPerformance[]>(
      state,
      (key) =>
        Array.isArray(key) &&
        key[0] === "theaterPerformances" &&
        key[1] === THEATER_PERFORMANCES_CALENDAR_QUERY_KEY[1],
    ) ??
    queryData<StrapiTheaterPerformance[]>(
      state,
      (key) => Array.isArray(key) && key[0] === "theaterPerformances",
    ) ??
    [];
  const forSlug = performances.filter((p) => p.theaterShowSlug === slug);
  const schedule = theaterScheduleRows(forSlug.length ? forSlug : performances.filter((p) => p.theaterShowSlug === slug));

  return {
    kind: "theater",
    h1: title,
    synopsis,
    href: `/theater/${slug}`,
    scheduleHeading: "Εμφανίσεις",
    schedule,
    jsonLd: null,
  };
}

export function buildDetailCrawlFromDehydrated(
  path: string,
  state: DehydratedState,
): DetailCrawlSnapshot | null {
  if (path.startsWith("/movies/") && !path.includes("/venue/") && !path.includes("/genre/") && !path.includes("/area/")) {
    const rest = path.replace(/^\/movies\//, "");
    if (rest && !rest.includes("/") && !["today", "week", "summer", "new", "soon"].includes(rest)) {
      return buildMovieDetailCrawlFromDehydrated(path, state);
    }
  }
  if (path.startsWith("/theater/") && path !== "/theater/kids") {
    const rest = path.replace(/^\/theater\//, "");
    if (rest && !rest.includes("/") && !rest.startsWith("venue/")) {
      return buildTheaterDetailCrawlFromDehydrated(path, state);
    }
  }
  return null;
}
