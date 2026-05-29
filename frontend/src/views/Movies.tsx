import { useEffect, useState, useMemo } from "react";
import { ChevronDown, ExternalLink, MapPin, SlidersHorizontal } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { moviesVenueProgramPath } from "@/lib/moviesVenuePath";
import {
  MOVIES_SECTION_SEGMENTS,
  type MoviesSectionSegment,
  moviesAreaPath,
  moviesGenrePath,
  moviesSectionPath,
  parseMoviesFilterPath,
} from "@/lib/moviesFilterPaths";
import { moviesAreaSeo, moviesGenreSeo, moviesSectionSeo } from "@/lib/moviesFilterSeo";
import { truncateDescription } from "@/lib/siteMetadata";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import EventCard from "@/components/EventCard";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useMovies, useShowtimes, useVenues, useMovieGenres } from "@/hooks/useStrapi";
import { movieGenreLinkItems } from "@/lib/movieGenreLinks";
import {
  cinemaGroupKey,
  findVenueFromStableKey,
  isValidExternalUrl,
  moviesHrefForVenue,
  resolveCinemaGroupFromShowtimes,
} from "@/lib/venueResolve";
import VenueBookingLink from "@/components/VenueBookingLink";
import ShowtimesExpandable from "@/components/ShowtimesExpandable";
import SummerScreeningIndicator from "@/components/SummerScreeningIndicator";
import VenueProgramLayout from "@/components/VenueProgramDay";
import type { StrapiMovie, StrapiShowtime, StrapiVenue } from "@/lib/api";
import { movieTitleLines } from "@/lib/movieTitles";
import { cn } from "@/lib/utils";
import {
  formatShowtimeWeekRangeLabel,
  moviesDaySectionMeta,
  parseShowtimeLocalDay,
  showtimeIsWeekBlock,
  showtimeWeekBlockOverlapsLocalDay,
  showtimeWeekRange,
  startOfLocalDay,
} from "@/lib/showtimeSchedule";
import {
  showtimeIsSummerOutdoor,
  showtimeShowsOutdoorLabel,
  showtimeMatchesHomeToday,
  showtimeMatchesHomeUpcomingCinemaWeek,
  showtimeMatchesHomeSummerCinemaRow,
  showtimeIsUpcoming,
  moviesReleasedInLastDays,
  moviesComingAfterUpcomingCinemaWeek,
  getUpcomingCinemaWeekBounds,
  moviesWithShowtimesInUpcomingCinemaWeek,
  enrichMoviesWithShowtimeGenre,
  formatUpcomingCinemaWeekRange,
  movieStubFromShowtime,
} from "@/lib/homeMovieFilters";
import { compareMoviesByShowingVenueCount } from "@/lib/movieCinemaSort";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";

const VENUE_CITY_LABELS: Record<string, string> = {
  athens: "Αθήνα",
  thessaloniki: "Θεσσαλονίκη",
  other: "Άλλο",
};

function venueCityLabel(venue: StrapiVenue): string {
  const c = typeof venue.city === "string" ? venue.city.trim().toLowerCase() : "";
  return VENUE_CITY_LABELS[c] ?? venue.city ?? "";
}

export type MoviesUrlSectionKey = MoviesSectionSegment;

function parseMoviesSectionParam(raw: string | null): MoviesUrlSectionKey | null {
  const v = raw?.trim().toLowerCase() ?? "";
  return (MOVIES_SECTION_SEGMENTS as readonly string[]).includes(v) ? (v as MoviesUrlSectionKey) : null;
}

/** Στη σελίδα /movies/week: πρώτες N ταινίες, μετά «Περισσότερες». */
const WEEK_MOVIES_PREVIEW_COUNT = 3;

const MOVIES_SECTION_BANNER: Record<MoviesUrlSectionKey, string> = {
  today: "Φιλτράρισμα: Ταινίες σήμερα",
  week: `Φιλτράρισμα: Ταινίες της ερχόμενης εβδομάδας (${formatUpcomingCinemaWeekRange()})`,
  summer: "Φιλτράρισμα: Θερινές προβολές (εβδομάδα σινεμά)",
  new: "Φιλτράρισμα: Τελευταίες κυκλοφορίες (10 μέρες)",
  soon: "Φιλτράρισμα: Προσεχώς (μετά την επόμενη εβδομάδα κινηματογράφου)",
};

const AREA_KEYS = ["athens", "thessaloniki", "other"] as const;
type AreaKey = (typeof AREA_KEYS)[number];

const AREA_LABELS: Record<AreaKey, string> = {
  athens: "Αθήνα",
  thessaloniki: "Θεσσαλονίκη",
  other: "Άλλο",
};

const ATHENS_DISTRICT_KEYS = ["center", "north", "south", "west", "east", "piraeus", "greater_other"] as const;
type AthensDistrictKey = (typeof ATHENS_DISTRICT_KEYS)[number];

const ATHENS_DISTRICT_LABELS: Record<AthensDistrictKey, string> = {
  center: "Κέντρο / κοντινά",
  north: "Βόρεια προάστια",
  south: "Νότια προάστια",
  west: "Δυτικά προάστια",
  east: "Ανατολικά προάστια",
  piraeus: "Πειραιάς",
  greater_other: "Υπόλοιπη Αττική",
};

function normalizeVenueCity(c: string | undefined): string {
  const s = (c ?? "").trim().toLowerCase();
  return AREA_KEYS.includes(s as AreaKey) ? s : "";
}

/** Προβολή ταινίας: φιλτράρισμα ανά slug είδους (ταινία στο map). */
function showtimeMatchesMovieGenre(
  st: StrapiShowtime,
  genreSlug: string,
  movieMap: Map<number, StrapiMovie>,
): boolean {
  if (st.movieId == null) return false;
  const m = movieMap.get(Number(st.movieId));
  if (!m) return false;
  const g = genreSlug.trim().toLowerCase();
  if (!g) return true;
  if (m.genreSlugs?.some((s) => s.toLowerCase() === g)) return true;
  if (m.genreSlug && m.genreSlug.toLowerCase() === g) return true;
  return false;
}

/** Συνδυασμός πόλης Αθήνα + υποπεριοχής (πεδίο district στο venue). */
function showtimeMatchesAthensDistrict(
  st: StrapiShowtime,
  district: AthensDistrictKey,
  venues: StrapiVenue[] | undefined,
): boolean {
  if (!venues?.length) return false;
  let v: StrapiVenue | undefined;
  if (st.venueId != null) v = venues.find((x) => Number(x.id) === Number(st.venueId));
  if (!v) {
    const vn = typeof st.venue === "string" ? st.venue.trim() : "";
    if (vn) v = venues.find((x) => x.name.trim() === vn);
  }
  if (!v) return false;
  if (normalizeVenueCity(v.city) !== "athens") return false;
  return v.district === district;
}

/** Περιοχή = πόλη χώρου (CMS)· αν δεν ταυτιστεί η προβολή με venue, δεν περνά το φίλτρο. */
function showtimeMatchesArea(st: StrapiShowtime, area: AreaKey, venues: StrapiVenue[] | undefined): boolean {
  if (!venues?.length) return false;
  let v: StrapiVenue | undefined;
  if (st.venueId != null) {
    v = venues.find((x) => Number(x.id) === Number(st.venueId));
  }
  if (!v) {
    const vn = typeof st.venue === "string" ? st.venue.trim() : "";
    if (vn) v = venues.find((x) => x.name.trim() === vn);
  }
  if (!v) return false;
  return normalizeVenueCity(v.city) === area;
}

function showtimeMatchesVenue(st: StrapiShowtime, venue: StrapiVenue): boolean {
  if (st.venueId != null && Number(st.venueId) === Number(venue.id)) return true;
  const vn = typeof st.venue === "string" ? st.venue.trim() : "";
  if (vn && venue.name.trim() === vn) return true;
  return false;
}

function formatShowtimeClock(d: Date): string {
  return d.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Γραμμή προβολής στη λίστα: ώρα · σύνδεσμος κινηματογράφου (θερινό δίπλα στο σινεμά). */
function MovieListShowtimeRow({
  row,
  venues,
  singleVenueFilter,
}: {
  row: ShowingRow;
  venues: StrapiVenue[] | undefined;
  singleVenueFilter: boolean;
}) {
  const venue = findVenueFromStableKey(venues, row.venueKey, row.venueLabel);
  const programHref = moviesHrefForVenue(venue);

  return (
    <li className="font-body flex flex-wrap items-center gap-1 tabular-nums leading-relaxed">
      <span className="inline-flex flex-wrap items-center gap-1 font-semibold text-foreground">
        {row.timesTba ? (
          <>
            <span>{row.weekRangeLabel ?? "Εβδομάδα"}</span>
            <span className="font-normal text-muted-foreground">· ώρες σύντομα</span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1 tabular-nums">
            {formatShowtimeClock(row.datetime)}
          </span>
        )}
      </span>
      {singleVenueFilter ? (
        row.hallName ? <span className="text-muted-foreground">{` · ${row.hallName}`}</span> : null
      ) : (
        <>
          <span className="text-muted-foreground"> · </span>
          {programHref ? (
            <Link to={programHref} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              {row.venueLabel}
              {row.summerScreening ? <SummerScreeningIndicator iconClassName="h-3 w-3" /> : null}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              {row.venueLabel}
              {row.summerScreening ? <SummerScreeningIndicator iconClassName="h-3 w-3" /> : null}
            </span>
          )}
        </>
      )}
    </li>
  );
}

type ShowingSlot = {
  datetime: Date;
  hallName?: string;
  /** CMS `summer_screening` — θερινή προβολή. */
  summerScreening?: boolean;
  /** Ολόκληρη εβδομάδα χωρίς ώρες. */
  timesTba?: boolean;
  weekRangeLabel?: string;
  weekRangeEnd?: Date;
};

function appendWeekBlockSlot(block: VenueShowingsBlock, st: StrapiShowtime, hallRaw: string, summerScreening: boolean) {
  const wr = showtimeWeekRange(st);
  if (!wr) return;
  const label = formatShowtimeWeekRangeLabel(st) ?? "Εβδομάδα";
  if (block.slots.some((s) => s.timesTba && `${s.weekRangeLabel ?? ""}-${s.hallName ?? ""}` === `${label}-${hallRaw}`)) {
    return;
  }
  const now = new Date();
  const slotDay = showtimeWeekBlockOverlapsLocalDay(st, now) ? startOfLocalDay(now) : wr.start;
  block.slots.push({
    datetime: slotDay,
    hallName: hallRaw || undefined,
    timesTba: true,
    weekRangeLabel: label,
    weekRangeEnd: wr.end,
    ...(summerScreening ? { summerScreening: true } : {}),
  });
}

function appendShowingSlot(block: VenueShowingsBlock, stDate: Date, hallRaw: string, summerScreening: boolean) {
  const slotDedupeKey = `${Math.floor(stDate.getTime() / 60000)}-${hallRaw}`;
  const existing = block.slots.find(
    (s) => `${Math.floor(s.datetime.getTime() / 60000)}-${s.hallName ?? ""}` === slotDedupeKey,
  );
  if (existing) {
    if (summerScreening) existing.summerScreening = true;
    return;
  }
  block.slots.push({
    datetime: stDate,
    hallName: hallRaw || undefined,
    ...(summerScreening ? { summerScreening: true } : {}),
  });
}

type VenueShowingsBlock = {
  key: string;
  venueLabel: string;
  slots: ShowingSlot[];
};

/** Μία γραμμή λίστας ανά προβολή — όχι πολλές ώρες στην ίδια γραμμή. */
type ShowingRow = {
  key: string;
  venueKey: string;
  venueLabel: string;
  datetime: Date;
  hallName?: string;
  summerScreening?: boolean;
  timesTba?: boolean;
  weekRangeLabel?: string;
};

type CinemaWeekClip = { start: Date; end: Date };

function clipShowingsToCinemaWeek(showings: VenueShowingsBlock[], clip: CinemaWeekClip): VenueShowingsBlock[] {
  const startMs = clip.start.getTime();
  const endMs = clip.end.getTime();
  return showings
    .map((b) => ({
      ...b,
      slots: b.slots.flatMap((slot) => {
        if (slot.timesTba && slot.weekRangeEnd) {
          const from = new Date(Math.max(slot.datetime.getTime(), startMs));
          const to = new Date(Math.min(slot.weekRangeEnd.getTime(), endMs));
          if (to.getTime() < from.getTime()) return [];
          return [{ ...slot, datetime: from, weekRangeEnd: to }];
        }
        const t = slot.datetime.getTime();
        return t >= startMs && t <= endMs ? [slot] : [];
      }),
    }))
    .filter((b) => b.slots.length > 0);
}

function flattenShowingsToRows(showings: VenueShowingsBlock[], cinemaWeekClip?: CinemaWeekClip): ShowingRow[] {
  const rows: ShowingRow[] = [];
  for (const b of showings) {
    const slots = [...b.slots].sort((x, y) => x.datetime.getTime() - y.datetime.getTime());
    for (const slot of slots) {
      rows.push({
        key: `${b.key}-${slot.timesTba ? `tba-${slot.weekRangeLabel}` : slot.datetime.getTime()}-${slot.hallName ?? ""}`,
        venueKey: b.key,
        venueLabel: b.venueLabel,
        datetime: slot.datetime,
        hallName: slot.hallName,
        summerScreening: slot.summerScreening,
        timesTba: slot.timesTba,
        weekRangeLabel: slot.weekRangeLabel,
      });
    }
  }
  return rows.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
}

function showtimeDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatShowtimeDayLabel(d: Date): string {
  return d.toLocaleDateString("el-GR", { weekday: "short", day: "numeric", month: "short" });
}

type ShowtimeDayGroup = { dayKey: string; dayLabel: string; rows: ShowingRow[] };

function groupShowtimeRowsByDay(rows: ShowingRow[]): ShowtimeDayGroup[] {
  const map = new Map<string, ShowingRow[]>();
  for (const row of rows) {
    const key = showtimeDayKey(row.datetime);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, dayRows]) => ({
      dayKey,
      dayLabel: formatShowtimeDayLabel(dayRows[0].datetime),
      rows: dayRows,
    }));
}

type MovieDayEntry = {
  movie: StrapiMovie;
  showings: VenueShowingsBlock[];
};

type DaySection = {
  label: string;
  date: Date;
  entries: MovieDayEntry[];
};

const FILTER_ALL = "__all__";

/** Φίλτρα λίστας ταινιών — συμπαγές πλάτος, ευανάγνωστα κείμενα. */
const MOVIES_FILTER_LABEL = "text-xs font-medium text-muted-foreground";
const MOVIES_FILTER_DISTRICT_CELL = "w-full min-w-[13.5rem] max-w-[18rem] shrink-0 space-y-1.5";
const MOVIES_FILTER_SELECT =
  "h-10 w-full min-w-0 appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-9 text-sm text-foreground shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

function SummerOutdoorToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border/10 bg-background/40 px-2.5 transition-colors hover:bg-background/65">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 shrink-0 rounded border-input text-[#13143E] accent-[#13143E] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <span className="whitespace-nowrap text-sm font-medium text-foreground">Θερινά</span>
    </label>
  );
}

const Movies = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathFilters = parseMoviesFilterPath(pathname);
  const { venueSlug: routeVenueSlug, genreSlug: routeGenreSlug } = useParams<{
    venueSlug?: string;
    genreSlug?: string;
    areaKey?: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryVenueSlug = searchParams.get("venue")?.trim() || "";
  const venueSlug = (routeVenueSlug?.trim() || queryVenueSlug).trim();
  const rawArea = searchParams.get("area")?.trim().toLowerCase() ?? "";
  const areaFilter: AreaKey | null =
    pathFilters.area ??
    (rawArea === "athens" || rawArea === "thessaloniki" || rawArea === "other" ? rawArea : null);
  const rawDistrict = searchParams.get("district")?.trim().toLowerCase() ?? "";
  const districtFilter: AthensDistrictKey | null = (ATHENS_DISTRICT_KEYS as readonly string[]).includes(
    rawDistrict,
  )
    ? (rawDistrict as AthensDistrictKey)
    : null;
  const rawGenre = searchParams.get("genre")?.trim().toLowerCase() ?? "";
  const genreFilterSlug =
    routeGenreSlug?.trim().toLowerCase() || pathFilters.genreSlug || rawGenre || null;
  const moviesSection = pathFilters.section ?? parseMoviesSectionParam(searchParams.get("section"));

  const clearMoviesSectionParam = () => {
    navigate("/movies");
  };

  const needsCatalogMovies = moviesSection === "new" || moviesSection === "soon" || moviesSection === "week";
  const [loadFullMovieCatalog, setLoadFullMovieCatalog] = useState(needsCatalogMovies);
  useEffect(() => {
    if (needsCatalogMovies) return;
    const schedule = () => setLoadFullMovieCatalog(true);
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(schedule, { timeout: 2800 });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(schedule, 1200);
    return () => window.clearTimeout(t);
  }, [needsCatalogMovies]);

  const { data: movies, isLoading: moviesLoading } = useMovies(loadFullMovieCatalog || needsCatalogMovies);
  const { data: showtimes, isLoading: showtimesLoading } = useShowtimes(true, venueSlug || undefined);
  const { data: venues, isLoading: venuesLoading } = useVenues();
  const needsGenreList = Boolean(genreFilterSlug || pathFilters.genreSlug || routeGenreSlug);
  const { data: movieGenresList } = useMovieGenres(needsGenreList);
  const [summerOutdoorOnly, setSummerOutdoorOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [weekMoviesExpanded, setWeekMoviesExpanded] = useState(false);

  useEffect(() => {
    setWeekMoviesExpanded(false);
  }, [moviesSection, venueSlug, areaFilter, districtFilter, genreFilterSlug, summerOutdoorOnly]);

  const hasExtraQueryFilters = Boolean(
    (queryVenueSlug && !routeVenueSlug) ||
      (parseMoviesSectionParam(searchParams.get("section")) && !pathFilters.section) ||
      (rawGenre && !routeGenreSlug && !pathFilters.genreSlug) ||
      ((rawArea === "athens" || rawArea === "thessaloniki" || rawArea === "other") && !pathFilters.area) ||
      districtFilter ||
      summerOutdoorOnly,
  );

  const moviesEnriched = useMemo(
    () => enrichMoviesWithShowtimeGenre(movies ?? [], showtimes ?? []),
    [movies, showtimes],
  );

  const setDistrictParam = (key: AthensDistrictKey | null) => {
    const next = new URLSearchParams(searchParams);
    next.delete("venue");
    next.delete("area");
    if (key) next.set("district", key);
    else next.delete("district");
    const qs = next.toString();
    if (pathFilters.area || pathFilters.genreSlug || pathFilters.section) {
      navigate(qs ? `/movies?${qs}` : "/movies");
      return;
    }
    setSearchParams(next);
  };

  const venueFilter = useMemo((): StrapiVenue | null => {
    if (!venueSlug || !venues?.length) return null;
    return venues.find((v) => v.slug === venueSlug) ?? null;
  }, [venues, venueSlug]);

  /** Λίστα /movies: μόνο Αθήνα· άλλες πόλεις μόνο από SEO path (/movies/area/…). */
  const effectiveAreaFilter: AreaKey | null = areaFilter ?? (venueFilter ? null : "athens");

  const activeFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (summerOutdoorOnly) parts.push("Θερινά");
    if (venueFilter) parts.push(venueFilter.name);
    else {
      if (areaFilter && areaFilter !== "athens") parts.push(AREA_LABELS[areaFilter]);
      if (districtFilter) parts.push(ATHENS_DISTRICT_LABELS[districtFilter]);
    }
    if (genreFilterSlug) {
      const g = movieGenresList?.find((x) => x.slug.toLowerCase() === genreFilterSlug);
      parts.push(g?.label ?? genreFilterSlug);
    }
    if (moviesSection) parts.push(MOVIES_SECTION_BANNER[moviesSection]);
    return parts;
  }, [
    summerOutdoorOnly,
    venueFilter,
    areaFilter,
    districtFilter,
    genreFilterSlug,
    moviesSection,
    movieGenresList,
  ]);

  const groupedMovies = useMemo((): DaySection[] => {
    if (!showtimes) return [];
    if (needsCatalogMovies && !movies) return [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const dayAfterTomorrowStart = new Date(tomorrowStart);
    dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 1);

    const movieMap = new Map<number, StrapiMovie>();
    (moviesEnriched ?? []).forEach((movie) => movieMap.set(movie.id, movie));

    const resolveMovie = (st: StrapiShowtime): StrapiMovie | null => {
      if (st.movieId != null) {
        const hit = movieMap.get(Number(st.movieId));
        if (hit) return hit;
      }
      const slug = typeof st.movieSlug === "string" ? st.movieSlug.trim() : "";
      if (slug) {
        const bySlug = (moviesEnriched ?? []).find((m) => m.slug === slug);
        if (bySlug) return bySlug;
        return movieStubFromShowtime(slug, st);
      }
      return null;
    };

    const baseSt = showtimes
      .filter((st) => st.movieId != null)
      .filter((st) => !summerOutdoorOnly || showtimeIsSummerOutdoor(st, venues))
      .filter((st) => !venueFilter || showtimeMatchesVenue(st, venueFilter))
      .filter((st) => !effectiveAreaFilter || showtimeMatchesArea(st, effectiveAreaFilter, venues))
      .filter((st) => !districtFilter || showtimeMatchesAthensDistrict(st, districtFilter, venues))
      .filter((st) => !genreFilterSlug || showtimeMatchesMovieGenre(st, genreFilterSlug, movieMap))
      .filter((st) => showtimeIsUpcoming(st, now))
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

    let programSt = baseSt;
    if (moviesSection === "today") {
      programSt = programSt.filter((st) => showtimeMatchesHomeToday(st, now));
    } else if (moviesSection === "summer") {
      programSt = programSt.filter((st) => showtimeMatchesHomeSummerCinemaRow(st, venues, now));
    }

    if (moviesSection === "new" || moviesSection === "soon" || moviesSection === "week") {
      const subset =
        moviesSection === "new"
          ? moviesReleasedInLastDays(moviesEnriched ?? [], 10, showtimes ?? [], venues, now)
          : moviesSection === "soon"
            ? moviesComingAfterUpcomingCinemaWeek(moviesEnriched ?? [], showtimes ?? [], venues, now)
            : moviesWithShowtimesInUpcomingCinemaWeek(moviesEnriched ?? [], showtimes ?? [], now);
      if (subset.length === 0) return [];

      const ids = new Set(subset.map((m) => m.id));

      const byMovieVenues = new Map<number, Map<string, VenueShowingsBlock>>();
      const stSubset = baseSt.filter((st) => {
        if (!ids.has(Number(st.movieId))) return false;
        if (moviesSection === "week") return showtimeMatchesHomeUpcomingCinemaWeek(st, now);
        return true;
      });

      for (const st of stSubset) {
        const movie = resolveMovie(st);
        if (!movie) continue;

        const hallRaw = typeof st.hallName === "string" ? st.hallName.trim() : "";
        const venueKey = cinemaGroupKey(st, venues);

        if (!movieMap.has(movie.id)) movieMap.set(movie.id, movie);
        if (!byMovieVenues.has(movie.id)) byMovieVenues.set(movie.id, new Map());
        const byVenue = byMovieVenues.get(movie.id)!;

        if (!byVenue.has(venueKey)) {
          const { venueName } = resolveCinemaGroupFromShowtimes([st], venues);
          byVenue.set(venueKey, { key: venueKey, venueLabel: venueName, slots: [] });
        }
        const block = byVenue.get(venueKey)!;
        if (showtimeIsWeekBlock(st)) {
          appendWeekBlockSlot(block, st, hallRaw, showtimeShowsOutdoorLabel(st));
          continue;
        }
        const stDate = parseShowtimeLocalDay(st.datetime);
        if (!stDate) continue;
        appendShowingSlot(block, stDate, hallRaw, showtimeShowsOutdoorLabel(st));
      }

      const entries: MovieDayEntry[] = subset.map((movie) => {
        const venueMap = byMovieVenues.get(movie.id);
        const showings =
          venueMap != null
            ? [...venueMap.values()]
                .map((b) => ({
                  ...b,
                  slots: [...b.slots]
                    .filter((s) => !s.timesTba)
                    .sort((x, y) => x.datetime.getTime() - y.datetime.getTime()),
                }))
                .filter((b) => b.slots.length > 0)
                .sort((a, b) => {
                  const ta = a.slots[0]?.datetime.getTime() ?? 0;
                  const tb = b.slots[0]?.datetime.getTime() ?? 0;
                  return ta - tb;
                })
            : [];
        return { movie, showings };
      });

      entries.sort(compareMoviesByShowingVenueCount);

      return [
        {
          label:
            moviesSection === "new"
              ? "Τελευταίες κυκλοφορίες"
              : moviesSection === "week"
                ? "Ερχόμενη εβδομάδα"
                : "Προσεχώς",
          date: todayStart,
          entries,
        },
      ];
    }

    const sectionMovieShowings = new Map<string, Map<number, Map<string, VenueShowingsBlock>>>();
    const sectionMeta = new Map<string, { label: string; date: Date }>();

    for (const st of programSt) {
      const section = moviesDaySectionMeta(st, now);
      if (!section) continue;
      const { sectionKey, sectionLabel, sectionDate } = section;

      if (!sectionMeta.has(sectionKey)) {
        sectionMeta.set(sectionKey, { label: sectionLabel, date: sectionDate });
      }

      const movie = resolveMovie(st);
      if (!movie) continue;

      const hallRaw = typeof st.hallName === "string" ? st.hallName.trim() : "";
      const venueKey = cinemaGroupKey(st, venues);

      if (!movieMap.has(movie.id)) movieMap.set(movie.id, movie);
      if (!sectionMovieShowings.has(sectionKey)) {
        sectionMovieShowings.set(sectionKey, new Map());
      }
      const byMovie = sectionMovieShowings.get(sectionKey)!;
      if (!byMovie.has(movie.id)) byMovie.set(movie.id, new Map());
      const byVenue = byMovie.get(movie.id)!;

      if (!byVenue.has(venueKey)) {
        const { venueName } = resolveCinemaGroupFromShowtimes([st], venues);
        byVenue.set(venueKey, { key: venueKey, venueLabel: venueName, slots: [] });
      }
      const block = byVenue.get(venueKey)!;
      if (showtimeIsWeekBlock(st)) {
        appendWeekBlockSlot(block, st, hallRaw, showtimeShowsOutdoorLabel(st));
        continue;
      }
      const slotDay = parseShowtimeLocalDay(st.datetime);
      if (!slotDay) continue;
      appendShowingSlot(block, slotDay, hallRaw, showtimeShowsOutdoorLabel(st));
    }

    const sections: DaySection[] = [...sectionMovieShowings.keys()].map((key) => {
      const meta = sectionMeta.get(key)!;
      const byMovie = sectionMovieShowings.get(key)!;
      const entries: MovieDayEntry[] = [...byMovie.entries()].map(([mid, venueMap]) => {
        const mv = movieMap.get(mid)!;
        const showings = [...venueMap.values()]
          .map((b) => ({
            ...b,
            slots: [...b.slots]
              .filter((s) => !s.timesTba)
              .sort((x, y) => x.datetime.getTime() - y.datetime.getTime()),
          }))
          .filter((b) => b.slots.length > 0);
        showings.sort((a, b) => {
          const ta = a.slots[0]?.datetime.getTime() ?? 0;
          const tb = b.slots[0]?.datetime.getTime() ?? 0;
          return ta - tb;
        });
        return { movie: mv, showings };
      });

      entries.sort(compareMoviesByShowingVenueCount);

      return { label: meta.label, date: meta.date, entries };
    });

    return sections
      .filter(
        (s) => s.entries.length > 0 && s.entries.some((e) => e.showings.some((sh) => sh.slots.length > 0)),
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [
    showtimes,
    movies,
    moviesEnriched,
    summerOutdoorOnly,
    venues,
    venueFilter,
    effectiveAreaFilter,
    districtFilter,
    genreFilterSlug,
    moviesSection,
    needsCatalogMovies,
  ]);

  function clearVenueFilter() {
    navigate("/movies");
  }

  const listCanonicalPath = useMemo(() => {
    if (venueFilter?.slug) return moviesVenueProgramPath(venueFilter.slug);
    if (pathFilters.section) return moviesSectionPath(pathFilters.section);
    if (pathFilters.genreSlug) return moviesGenrePath(pathFilters.genreSlug);
    if (pathFilters.area) return moviesAreaPath(pathFilters.area);
    return "/movies";
  }, [venueFilter?.slug, pathFilters.section, pathFilters.genreSlug, pathFilters.area]);

  const listSeo = useMemo(() => {
    if (venueFilter) {
      return {
        title: `Πρόγραμμα — ${venueFilter.name}`,
        description: truncateDescription(
          venueFilter.address?.trim()
            ? `Πρόγραμμα ταινιών στο ${venueFilter.name} (${venueFilter.address.trim()}). Ώρες προβολών και αφίσες.`
            : `Πρόγραμμα ταινιών στο ${venueFilter.name}. Ώρες προβολών, αφίσες και κράτηση.`,
        ),
        h1: venueFilter.name,
      };
    }
    if (pathFilters.section) {
      const s = moviesSectionSeo(pathFilters.section);
      return { title: s.title, description: s.description, h1: s.h1 };
    }
    if (pathFilters.genreSlug) {
      const g = movieGenresList?.find((x) => x.slug.toLowerCase() === pathFilters.genreSlug);
      const s = moviesGenreSeo(pathFilters.genreSlug, g?.label);
      return { title: s.title, description: s.description, h1: s.h1 };
    }
    if (pathFilters.area) {
      const s = moviesAreaSeo(pathFilters.area);
      return { title: s.title, description: s.description, h1: s.h1 };
    }
    return {
      title: staticPageSeo.movies.title,
      description: staticPageSeo.movies.description,
      h1: "Ταινίες",
    };
  }, [venueFilter, pathFilters.section, pathFilters.genreSlug, pathFilters.area, movieGenresList]);

  usePageSeo({
    title: listSeo.title,
    description: listSeo.description,
    path: listCanonicalPath,
    canonicalPath: listCanonicalPath,
    noIndex: hasExtraQueryFilters,
  });

  if (!routeVenueSlug && queryVenueSlug) {
    return <Navigate to={moviesVenueProgramPath(queryVenueSlug)} replace />;
  }
  const querySection = parseMoviesSectionParam(searchParams.get("section"));
  if (querySection && !pathFilters.section) {
    return <Navigate to={moviesSectionPath(querySection)} replace />;
  }
  if (rawGenre && !routeGenreSlug && !pathFilters.genreSlug) {
    return <Navigate to={moviesGenrePath(rawGenre)} replace />;
  }
  if (
    (rawArea === "athens" || rawArea === "thessaloniki" || rawArea === "other") &&
    !pathFilters.area
  ) {
    return <Navigate to={moviesAreaPath(rawArea as AreaKey)} replace />;
  }

  const pageH1 = listSeo.h1;

  const needsVenueData = Boolean(venueSlug || areaFilter || districtFilter || summerOutdoorOnly || moviesSection === "summer");

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="section-black mb-6 max-md:-mt-16 max-md:py-5 max-md:pt-20 md:-mt-28 md:mb-8 md:py-10 md:pt-36">
        <div className="container">
          <div>
            <h1 className="font-display text-2xl font-bold text-white mb-1 md:mb-2 md:text-4xl">
              {pageH1}
            </h1>
            {!venueFilter && !pathFilters.section && !pathFilters.genreSlug && !pathFilters.area ? (
              <p className="text-sm text-white/60 md:text-base">Τώρα στα σινεμά στην Αθήνα</p>
            ) : null}
            {venueFilter ? (
              <div className="mt-3 space-y-1.5 text-sm text-white/75 md:mt-4">
                {venueFilter.address?.trim() ? (
                  <p className="flex items-start gap-2 max-w-2xl">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/45" aria-hidden />
                    {isValidExternalUrl(venueFilter.googleMapsUrl) ? (
                      <a
                        href={venueFilter.googleMapsUrl.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex flex-wrap items-center gap-1 underline decoration-white/25 underline-offset-2 hover:text-white hover:decoration-white/50"
                      >
                        <span>{venueFilter.address.trim()}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                        <span className="sr-only"> (χάρτης)</span>
                      </a>
                    ) : (
                      <span>{venueFilter.address.trim()}</span>
                    )}
                  </p>
                ) : null}
                {venueCityLabel(venueFilter) ? (
                  <p className="pl-6 text-xs font-medium uppercase tracking-wide text-white/50 md:text-sm">
                    {venueCityLabel(venueFilter)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="container">
        {venueSlug && !venueFilter && !venuesLoading ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-950/[0.09] px-4 py-3.5 ring-1 ring-amber-600/18">
            <p className="text-sm text-amber-100/90">Ο σύνδεσμος χώρου δεν αντιστοιχεί σε καταχωρημένο venue.</p>
            <button
              type="button"
              onClick={clearVenueFilter}
              className="shrink-0 rounded-lg bg-black/35 px-3 py-2 text-sm font-medium text-amber-50 shadow-none ring-1 ring-amber-500/25 transition-colors hover:bg-black/55"
            >
              Επαναφορά
            </button>
          </div>
        ) : null}

        {moviesSection ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/35 px-4 py-3.5 ring-1 ring-border/[0.08]">
            <p className="text-sm md:text-[0.9375rem] text-foreground leading-snug">{MOVIES_SECTION_BANNER[moviesSection]}</p>
            <button
              type="button"
              onClick={clearMoviesSectionParam}
              className="shrink-0 rounded-lg bg-background/65 px-3 py-2 text-sm font-medium text-foreground shadow-none ring-1 ring-border/10 transition-colors hover:bg-background/85"
            >
              Όλες οι προβολές
            </button>
          </div>
        ) : null}

        <div className="mb-5 rounded-xl border border-border/15 bg-muted/25 ring-1 ring-border/[0.06] max-md:mb-4 md:mb-5">
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <div className="flex justify-end px-3 py-2.5 md:px-3.5 lg:px-4">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-lg border border-border/15 bg-background/50 px-3 py-2 transition-colors hover:bg-background/80"
                  aria-expanded={filtersOpen}
                >
                  <SlidersHorizontal className="h-4 w-4 shrink-0 text-[#13143E]" aria-hidden />
                  <span className="min-w-0 text-left">
                    <span className="block text-sm font-semibold text-foreground">Φίλτρα</span>
                    {activeFilterSummary.length > 0 ? (
                      <span className="mt-0.5 block max-w-[11rem] truncate text-xs text-muted-foreground sm:max-w-[14rem] md:max-w-[22rem]">
                        {activeFilterSummary.join(" · ")}
                      </span>
                    ) : null}
                  </span>
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <div className="space-y-3 px-3 pb-3 md:px-3.5 lg:px-4">
                <div className="flex flex-wrap items-end gap-2 lg:gap-3">
                  {!venueFilter ? (
                    <div className={MOVIES_FILTER_DISTRICT_CELL}>
                      <label htmlFor="movies-filter-district" className={MOVIES_FILTER_LABEL}>
                        Περιοχή
                      </label>
                      <div className="relative">
                        <select
                          id="movies-filter-district"
                          value={districtFilter ?? FILTER_ALL}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDistrictParam(v === FILTER_ALL ? null : (v as AthensDistrictKey));
                          }}
                          disabled={venuesLoading}
                          className={MOVIES_FILTER_SELECT}
                          aria-label="Περιοχή Αθήνας"
                        >
                          <option value={FILTER_ALL}>Όλη η Αθήνα</option>
                          {(ATHENS_DISTRICT_KEYS as readonly AthensDistrictKey[]).map((key) => (
                            <option key={key} value={key}>
                              {ATHENS_DISTRICT_LABELS[key]}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden
                        />
                      </div>
                    </div>
                  ) : null}
                  <SummerOutdoorToggle
                    checked={summerOutdoorOnly}
                    onChange={() => setSummerOutdoorOnly((x) => !x)}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {showtimesLoading || (needsVenueData && venuesLoading) || (needsCatalogMovies && moviesLoading) ? (
          <LoadingState message="Φόρτωση ταινιών..." />
        ) : (
          <div className="space-y-10">
            {venueFilter && groupedMovies.length > 0 ? (
              <VenueProgramLayout sections={groupedMovies} venue={venueFilter} />
            ) : null}
            {!venueFilter
              ? groupedMovies.map((section) => {
                  const isWeekPage = moviesSection === "week";
                  const totalEntries = section.entries.length;
                  const visibleEntries =
                    isWeekPage && !weekMoviesExpanded
                      ? section.entries.slice(0, WEEK_MOVIES_PREVIEW_COUNT)
                      : section.entries;
                  const weekHasMore =
                    isWeekPage && !weekMoviesExpanded && totalEntries > WEEK_MOVIES_PREVIEW_COUNT;
                  const cinemaWeekClip = isWeekPage ? getUpcomingCinemaWeekBounds() : undefined;

                  return (
                    <section
                      key={section.label}
                      className="rounded-xl border border-border/15 bg-muted/20 p-4 ring-1 ring-border/[0.06] md:p-5"
                    >
                  <h2 className="font-display mb-1 text-lg font-semibold capitalize text-[#13143E] md:mb-2 md:text-2xl">
                    {section.label}
                  </h2>
                  <p className="mb-4 text-xs text-muted-foreground md:mb-5">
                    {isWeekPage
                      ? weekHasMore
                        ? `Εμφανίζονται ${WEEK_MOVIES_PREVIEW_COUNT} από ${totalEntries} ταινίες της εβδομάδας`
                        : "Προβολές της ερχόμενης εβδομάδας κινηματογράφου"
                      : "Όλες οι προβολές παρακάτω ανήκουν σε αυτή την ημέρα"}
                  </p>
                  <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {visibleEntries.map(({ movie, showings }, i) => {
                      const tl = movieTitleLines(movie);
                      const cardShowings = cinemaWeekClip
                        ? clipShowingsToCinemaWeek(showings, cinemaWeekClip)
                        : showings;
                      const rows = flattenShowingsToRows(cardShowings, cinemaWeekClip);
                      const dayGroups = groupShowtimeRowsByDay(rows);
                      const hasShowRows = rows.length > 0;
                      return (
                        <div
                          key={`${section.label}-${movie.slug}`}
                          className="group/movie-stack flex flex-col overflow-hidden rounded-lg bg-muted/30 ring-1 ring-border/[0.1] transition-[box-shadow] hover:shadow-[0_10px_32px_rgba(28,29,98,0.1)] hover:ring-border/[0.18]"
                        >
                          <EventCard
                            slug={movie.slug}
                            title={tl.primary}
                            titleSecondary={tl.secondary}
                            subtitle={movie.director ?? ""}
                            genre={movie.genre}
                            genreLinkItems={movieGenreLinkItems(movie, movieGenresList)}
                            duration={movie.duration}
                            score={movie.criticScore}
                            posterUrl={movie.posterUrl}
                            posterSrcSet={movie.posterSrcSet}
                            type="movie"
                            isDubbed={movie.isDubbed}
                            tone="soft"
                            attachShowtimes={hasShowRows}
                            index={i}
                            className="w-full"
                          />
                          {hasShowRows ? (
                            <div className="shrink-0 border-t border-border/[0.12] bg-background/40 px-2.5 pb-2 pt-2 text-xs leading-snug text-muted-foreground sm:text-sm">
                              <div className="space-y-2">
                                {dayGroups.map((group) => (
                                  <div key={group.dayKey}>
                                    {dayGroups.length > 1 ? (
                                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#13143E]">
                                        {group.dayLabel}
                                      </p>
                                    ) : null}
                                    <ShowtimesExpandable listClassName="space-y-1.5">
                                      {group.rows.map((row) => (
                                        <MovieListShowtimeRow
                                          key={row.key}
                                          row={row}
                                          venues={venues}
                                          singleVenueFilter={false}
                                        />
                                      ))}
                                    </ShowtimesExpandable>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : moviesSection === "new" || moviesSection === "soon" ? (
                            <div className="border-t border-border/[0.1] px-2.5 py-3 text-center text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                              Δεν έχουν καταχωρηθεί προβολές από σήμερα για αυτό το φίλτρο.
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  {weekHasMore ? (
                    <div className="mt-6 flex justify-center border-t border-border/15 pt-5">
                      <button
                        type="button"
                        onClick={() => setWeekMoviesExpanded(true)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#13143E] underline underline-offset-4 hover:text-[#13143E]/80"
                      >
                        Περισσότερες
                      </button>
                    </div>
                  ) : null}
                    </section>
                  );
                })
              : null}
          </div>
        )}

        {!showtimesLoading &&
          !(needsVenueData && venuesLoading) &&
          !(needsCatalogMovies && moviesLoading) &&
          groupedMovies.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-base">
            <p>
              {venueSlug && !venueFilter && !venuesLoading
                ? "Δεν βρέθηκε ο χώρος του συνδέσμου."
                : venueFilter
                  ? `Δεν βρέθηκαν προβολές στο ${venueFilter.name} για αυτό το φίλτρο.`
                  : districtFilter
                    ? `Δεν βρέθηκαν προβολές στην περιοχή «${ATHENS_DISTRICT_LABELS[districtFilter]}» για αυτό το φίλτρο.`
                    : areaFilter && areaFilter !== "athens"
                      ? `Δεν βρέθηκαν προβολές στην πόλη «${AREA_LABELS[areaFilter]}» για αυτό το φίλτρο.`
                    : genreFilterSlug
                      ? "Δεν βρέθηκαν προβολές για το είδος και τα υπόλοιπα φίλτρα."
                      : summerOutdoorOnly
                      ? "Δεν βρέθηκαν μελλοντικές προβολές σε θερινούς χώρους για αυτό το φίλτρο."
                      : moviesSection === "today"
                        ? "Δεν βρέθηκαν προβολές για σήμερα με τα τρέχοντα φίλτρα."
                        : moviesSection === "week"
                          ? "Δεν βρέθηκαν προβολές για την τρέχουσα εβδομάδα (Δευ–Κυρ) με τα φίλτρα σου."
                          : moviesSection === "summer"
                            ? "Δεν βρέθηκαν θερινές προβολές εντός της τρέχουσας εβδομάδας κινηματογράφου."
                            : moviesSection === "new"
                              ? "Δεν υπάρχουν ταινίες με ημερομηνία κυκλοφορίας στις τελευταίες 10 ημέρες."
                              : moviesSection === "soon"
                                ? "Δεν υπάρχουν ταινίες με προγραμματισμένη κυκλοφορία μετά τη σημερινή ημέρα."
                                : "Δεν βρέθηκαν προβολές για αυτό το φίλτρο."}
            </p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Movies;