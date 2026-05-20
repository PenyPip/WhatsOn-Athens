import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import EventCard from "@/components/EventCard";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMovies, useShowtimes, useVenues, useMovieGenres } from "@/hooks/useStrapi";
import { movieGenreLinkItems } from "@/lib/movieGenreLinks";
import {
  cinemaGroupKey,
  isValidExternalUrl,
  resolveCinemaGroupFromShowtimes,
} from "@/lib/venueResolve";
import VenueBookingLink from "@/components/VenueBookingLink";
import ShowtimesExpandable from "@/components/ShowtimesExpandable";
import type { StrapiMovie, StrapiShowtime, StrapiVenue } from "@/lib/api";
import { movieTitleLines } from "@/lib/movieTitles";
import {
  showtimeIsSummerOutdoor,
  showtimeMatchesHomeToday,
  showtimeMatchesHomeUpcomingCinemaWeek,
  showtimeMatchesHomeSummerCinemaRow,
  showtimeIsUpcoming,
  moviesReleasedInLastDays,
  moviesComingAfterUpcomingCinemaWeek,
  moviesForUpcomingCinemaWeek,
  enrichMoviesWithShowtimeGenre,
  formatUpcomingCinemaWeekRange,
} from "@/lib/homeMovieFilters";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";

const MOVIES_SECTION_QUERY_KEYS = ["today", "week", "summer", "new", "soon"] as const;
export type MoviesUrlSectionKey = (typeof MOVIES_SECTION_QUERY_KEYS)[number];

function parseMoviesSectionParam(raw: string | null): MoviesUrlSectionKey | null {
  const v = raw?.trim().toLowerCase() ?? "";
  return (MOVIES_SECTION_QUERY_KEYS as readonly string[]).includes(v) ? (v as MoviesUrlSectionKey) : null;
}

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

type ShowingSlot = {
  datetime: Date;
  hallName?: string;
};

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
};

function flattenShowingsToRows(showings: VenueShowingsBlock[]): ShowingRow[] {
  const rows: ShowingRow[] = [];
  for (const b of showings) {
    const slots = [...b.slots].sort((x, y) => x.datetime.getTime() - y.datetime.getTime());
    for (const slot of slots) {
      rows.push({
        key: `${b.key}-${slot.datetime.getTime()}-${slot.hallName ?? ""}`,
        venueKey: b.key,
        venueLabel: b.venueLabel,
        datetime: slot.datetime,
        hallName: slot.hallName,
      });
    }
  }
  return rows.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
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

const Movies = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const venueSlug = searchParams.get("venue")?.trim() || "";
  const rawArea = searchParams.get("area")?.trim().toLowerCase() ?? "";
  const areaFilter: AreaKey | null =
    rawArea === "athens" || rawArea === "thessaloniki" || rawArea === "other" ? rawArea : null;
  const rawDistrict = searchParams.get("district")?.trim().toLowerCase() ?? "";
  const districtFilter: AthensDistrictKey | null =
    areaFilter === "athens" && (ATHENS_DISTRICT_KEYS as readonly string[]).includes(rawDistrict)
      ? (rawDistrict as AthensDistrictKey)
      : null;
  const rawGenre = searchParams.get("genre")?.trim().toLowerCase() ?? "";
  const genreFilterSlug = rawGenre || null;
  const moviesSection = parseMoviesSectionParam(searchParams.get("section"));

  const hasListFilters = Boolean(
    venueSlug || areaFilter || districtFilter || genreFilterSlug || moviesSection,
  );

  usePageSeo({
    ...staticPageSeo.movies,
    canonicalPath: "/movies",
    path: "/movies",
    noIndex: hasListFilters,
  });

  const clearMoviesSectionParam = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("section");
    setSearchParams(next);
  };

  const { data: movies, isLoading } = useMovies();
  const { data: showtimes, isLoading: showtimesLoading } = useShowtimes();
  const { data: venues, isLoading: venuesLoading } = useVenues();
  const { data: movieGenresList } = useMovieGenres();
  const [summerOutdoorOnly, setSummerOutdoorOnly] = useState(false);

  const moviesEnriched = useMemo(
    () => enrichMoviesWithShowtimeGenre(movies ?? [], showtimes ?? []),
    [movies, showtimes],
  );

  const venuesSorted = useMemo(
    () => [...(venues ?? [])].sort((a, b) => a.name.localeCompare(b.name, "el")),
    [venues],
  );

  /** Χώροι που έχουν τουλάχιστον μία προβολή με συνδεδεμένη ταινία. */
  const venueIdsWithMovieShowtime = useMemo(() => {
    const ids = new Set<number>();
    for (const st of showtimes ?? []) {
      if (st.movieId == null) continue;
      if (st.venueId != null) ids.add(Number(st.venueId));
    }
    return ids;
  }, [showtimes]);

  /** Μόνο σινεμά με ταινίες + τρέχον φίλτρο πόλης/περιοχής Αθήνας. */
  const venuesForSelect = useMemo(() => {
    return venuesSorted.filter((v) => {
      if (!venueIdsWithMovieShowtime.has(v.id)) return false;
      const cityNorm = normalizeVenueCity(v.city);
      if (areaFilter && cityNorm !== areaFilter) return false;
      if (areaFilter === "athens" && districtFilter) {
        if (cityNorm !== "athens") return false;
        return v.district === districtFilter;
      }
      return true;
    });
  }, [venuesSorted, venueIdsWithMovieShowtime, areaFilter, districtFilter]);

  const venueSelectValue = useMemo(() => {
    if (!venueSlug) return FILTER_ALL;
    const hit = venuesForSelect.find((v) => v.slug === venueSlug);
    return hit ? hit.slug : FILTER_ALL;
  }, [venueSlug, venuesForSelect]);

  const setAreaParam = (key: AreaKey | null) => {
    const next = new URLSearchParams(searchParams);
    next.delete("venue");
    next.delete("district");
    if (key) next.set("area", key);
    else next.delete("area");
    setSearchParams(next);
  };

  const setDistrictParam = (key: AthensDistrictKey | null) => {
    const next = new URLSearchParams(searchParams);
    next.delete("venue");
    if (key) next.set("district", key);
    else next.delete("district");
    setSearchParams(next);
  };

  const setVenueParam = (slug: string | null) => {
    const next = new URLSearchParams(searchParams);
    next.delete("area");
    next.delete("district");
    if (slug) next.set("venue", slug);
    else next.delete("venue");
    setSearchParams(next);
  };

  const setGenreParam = (slug: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (slug) next.set("genre", slug);
    else next.delete("genre");
    setSearchParams(next);
  };

  const venueFilter = useMemo((): StrapiVenue | null => {
    if (!venueSlug || !venues?.length) return null;
    return venues.find((v) => v.slug === venueSlug) ?? null;
  }, [venues, venueSlug]);

  const groupedMovies = useMemo((): DaySection[] => {
    if (!showtimes || !movies) return [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const dayAfterTomorrowStart = new Date(tomorrowStart);
    dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 1);

    const movieMap = new Map<number, StrapiMovie>();
    (moviesEnriched ?? []).forEach((movie) => movieMap.set(movie.id, movie));

    const baseSt = showtimes
      .filter((st) => st.movieId != null)
      .filter((st) => !summerOutdoorOnly || showtimeIsSummerOutdoor(st, venues))
      .filter((st) => !venueFilter || showtimeMatchesVenue(st, venueFilter))
      .filter((st) => !areaFilter || showtimeMatchesArea(st, areaFilter, venues))
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
          ? moviesReleasedInLastDays(moviesEnriched ?? [], 10, now)
          : moviesSection === "soon"
            ? moviesComingAfterUpcomingCinemaWeek(moviesEnriched ?? [], now)
            : moviesForUpcomingCinemaWeek(moviesEnriched ?? [], showtimes, now);
      if (subset.length === 0) return [];

      const ids = new Set(subset.map((m) => m.id));

      const byMovieVenues = new Map<number, Map<string, VenueShowingsBlock>>();
      const stSubset = baseSt.filter((st) => {
        if (!ids.has(Number(st.movieId))) return false;
        if (moviesSection === "week") return showtimeMatchesHomeUpcomingCinemaWeek(st, now);
        return true;
      });

      for (const st of stSubset) {
        const stDate = new Date(st.datetime);
        if (Number.isNaN(stDate.getTime())) continue;
        const movie = movieMap.get(Number(st.movieId));
        if (!movie) continue;

        const hallRaw = typeof st.hallName === "string" ? st.hallName.trim() : "";
        const venueKey = cinemaGroupKey(st, venues);
        const slotDedupeKey = `${Math.floor(stDate.getTime() / 60000)}-${hallRaw}`;

        if (!byMovieVenues.has(movie.id)) byMovieVenues.set(movie.id, new Map());
        const byVenue = byMovieVenues.get(movie.id)!;

        if (!byVenue.has(venueKey)) {
          const { venueName } = resolveCinemaGroupFromShowtimes([st], venues);
          byVenue.set(venueKey, { key: venueKey, venueLabel: venueName, slots: [] });
        }
        const block = byVenue.get(venueKey)!;
        if (block.slots.some((s) => `${Math.floor(s.datetime.getTime() / 60000)}-${s.hallName ?? ""}` === slotDedupeKey)) {
          continue;
        }
        block.slots.push({
          datetime: stDate,
          hallName: hallRaw || undefined,
        });
      }

      const entries: MovieDayEntry[] = subset.map((movie) => {
        const venueMap = byMovieVenues.get(movie.id);
        const showings =
          venueMap != null
            ? [...venueMap.values()]
                .map((b) => ({
                  ...b,
                  slots: [...b.slots].sort((x, y) => x.datetime.getTime() - y.datetime.getTime()),
                }))
                .sort((a, b) => {
                  const ta = a.slots[0]?.datetime.getTime() ?? 0;
                  const tb = b.slots[0]?.datetime.getTime() ?? 0;
                  return ta - tb;
                })
            : [];
        return { movie, showings };
      });

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
      const stDate = new Date(st.datetime);
      if (Number.isNaN(stDate.getTime())) continue;

      let sectionKey: string;
      let sectionLabel: string;
      let sectionDate: Date;

      if (stDate >= todayStart && stDate < tomorrowStart) {
        sectionKey = "today";
        sectionLabel = "Σήμερα";
        sectionDate = todayStart;
      } else if (stDate >= tomorrowStart && stDate < dayAfterTomorrowStart) {
        sectionKey = "tomorrow";
        sectionLabel = "Αύριο";
        sectionDate = tomorrowStart;
      } else {
        sectionDate = new Date(stDate.getFullYear(), stDate.getMonth(), stDate.getDate());
        sectionKey = sectionDate.toISOString().slice(0, 10);
        sectionLabel = sectionDate.toLocaleDateString("el-GR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
      }

      if (!sectionMeta.has(sectionKey)) {
        sectionMeta.set(sectionKey, { label: sectionLabel, date: sectionDate });
      }

      const movie = movieMap.get(Number(st.movieId));
      if (!movie) continue;

      const hallRaw = typeof st.hallName === "string" ? st.hallName.trim() : "";
      const venueKey = cinemaGroupKey(st, venues);
      const slotDedupeKey = `${Math.floor(stDate.getTime() / 60000)}-${hallRaw}`;

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
      if (block.slots.some((s) => `${Math.floor(s.datetime.getTime() / 60000)}-${s.hallName ?? ""}` === slotDedupeKey)) {
        continue;
      }
      block.slots.push({
        datetime: stDate,
        hallName: hallRaw || undefined,
      });
    }

    const sections: DaySection[] = [...sectionMovieShowings.keys()].map((key) => {
      const meta = sectionMeta.get(key)!;
      const byMovie = sectionMovieShowings.get(key)!;
      const entries: MovieDayEntry[] = [...byMovie.entries()].map(([mid, venueMap]) => {
        const mv = movieMap.get(mid)!;
        const showings = [...venueMap.values()].map((b) => ({
          ...b,
          slots: [...b.slots].sort((x, y) => x.datetime.getTime() - y.datetime.getTime()),
        }));
        showings.sort((a, b) => {
          const ta = a.slots[0]?.datetime.getTime() ?? 0;
          const tb = b.slots[0]?.datetime.getTime() ?? 0;
          return ta - tb;
        });
        return { movie: mv, showings };
      });

      entries.sort((a, b) => {
        const ta = a.showings[0]?.slots[0]?.datetime.getTime() ?? 0;
        const tb = b.showings[0]?.slots[0]?.datetime.getTime() ?? 0;
        return ta - tb;
      });

      return { label: meta.label, date: meta.date, entries };
    });

    return sections.filter((s) => s.entries.length > 0).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [showtimes, movies, moviesEnriched, summerOutdoorOnly, venues, venueFilter, areaFilter, districtFilter, genreFilterSlug, moviesSection]);

  function clearVenueFilter() {
    setVenueParam(null);
  }

  const needsVenueData = Boolean(venueSlug || areaFilter || districtFilter || summerOutdoorOnly || moviesSection === "summer");

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="section-black mb-6 max-md:-mt-16 max-md:py-5 max-md:pt-20 md:-mt-28 md:mb-8 md:py-10 md:pt-36">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-display text-2xl font-bold text-white mb-1 md:mb-2 md:text-4xl">
              {venueFilter ? venueFilter.name : "Ταινίες"}
            </h1>
            <p className="text-sm text-white/60 md:text-base">
              {venueFilter ? "Πρόγραμμα προβολών" : "Τώρα στα σινεμά σε όλη την Ελλάδα"}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container">
        {venueFilter && isValidExternalUrl(venueFilter.moreLink) ? (
          <div className="mb-6 flex flex-wrap items-center gap-3 md:mb-8">
            <VenueBookingLink venue={venueFilter} variant="button" />
          </div>
        ) : null}

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

        <div className="mb-5 rounded-xl border border-border/15 bg-muted/25 px-3 py-3 ring-1 ring-border/[0.06] max-md:mb-4 md:mb-6 md:px-5 md:py-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 md:mb-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground md:text-[11px]">
              Φίλτρα
            </p>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border/10 bg-background/40 px-2.5 py-1.5 transition-colors hover:bg-background/65 md:gap-3 md:rounded-lg md:px-3 md:py-2.5">
              <input
                type="checkbox"
                checked={summerOutdoorOnly}
                onChange={() => setSummerOutdoorOnly((x) => !x)}
                className="h-3.5 w-3.5 shrink-0 rounded border-input text-[#13143E] accent-[#13143E] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-4 md:w-4"
              />
              <span className="text-xs font-medium text-foreground md:text-sm">Θερινές μόνο</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
            <div className="space-y-1 md:space-y-2">
              <span className="text-[10px] font-medium text-muted-foreground md:text-xs" id="movies-filter-city-label">
                Πόλη
              </span>
              <Select
                value={areaFilter ?? FILTER_ALL}
                onValueChange={(v) => setAreaParam(v === FILTER_ALL ? null : (v as AreaKey))}
                disabled={venuesLoading || Boolean(venueFilter)}
              >
                <SelectTrigger aria-labelledby="movies-filter-city-label" className="h-9 w-full text-xs md:h-10 md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={FILTER_ALL}>Παντού</SelectItem>
                  {(AREA_KEYS as readonly AreaKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {AREA_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {areaFilter === "athens" && !venueFilter ? (
              <div className="col-span-2 space-y-1 sm:col-span-2 xl:col-span-1 md:space-y-2">
                <span className="text-[10px] font-medium text-muted-foreground md:text-xs" id="movies-filter-district-label">
                  Περιοχή
                </span>
                <Select
                  value={districtFilter ?? FILTER_ALL}
                  onValueChange={(v) =>
                    setDistrictParam(v === FILTER_ALL ? null : (v as AthensDistrictKey))
                  }
                  disabled={venuesLoading}
                >
                  <SelectTrigger aria-labelledby="movies-filter-district-label" className="h-9 w-full text-xs md:h-10 md:text-sm">
                    <SelectValue placeholder="Όλη η Αθήνα" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value={FILTER_ALL}>Όλη η Αθήνα</SelectItem>
                    {(ATHENS_DISTRICT_KEYS as readonly AthensDistrictKey[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {ATHENS_DISTRICT_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-1 md:space-y-2">
              <span className="text-[10px] font-medium text-muted-foreground md:text-xs" id="movies-filter-venue-label">
                Σινεμά
              </span>
              <Select
                value={venueSelectValue}
                onValueChange={(v) => setVenueParam(v === FILTER_ALL ? null : v)}
                disabled={venuesLoading}
              >
                <SelectTrigger aria-labelledby="movies-filter-venue-label" className="h-9 w-full text-xs md:h-10 md:text-sm">
                  <SelectValue placeholder="Όλα τα σινεμά" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={FILTER_ALL}>Όλα</SelectItem>
                  {venuesForSelect.map((v) => (
                    <SelectItem key={v.id} value={v.slug}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:space-y-2">
              <span className="text-[10px] font-medium text-muted-foreground md:text-xs" id="movies-filter-genre-label">
                Είδος
              </span>
              <Select
                value={genreFilterSlug ?? FILTER_ALL}
                onValueChange={(v) => setGenreParam(v === FILTER_ALL ? null : v)}
                disabled={isLoading}
              >
                <SelectTrigger aria-labelledby="movies-filter-genre-label" className="h-9 w-full text-xs md:h-10 md:text-sm">
                  <SelectValue placeholder="Όλα τα είδη" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={FILTER_ALL}>Όλα</SelectItem>
                  {[...(movieGenresList ?? [])]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((g) => (
                      <SelectItem key={g.id} value={g.slug.toLowerCase()}>
                        {g.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {venueFilter ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Τα φίλτρα πόλης και περιοχής Αθήνας είναι αδρανή όταν έχεις επιλέξει συγκεκριμένο σινεμά.
            </p>
          ) : null}
        </div>

        {isLoading || showtimesLoading || (needsVenueData && venuesLoading) ? (
          <LoadingState message="Φόρτωση ταινιών..." />
        ) : (
          <div className="space-y-10">
            {groupedMovies.map((section) => (
              <section key={section.label}>
                <h2 className="font-display mb-3 text-lg font-semibold capitalize md:mb-4 md:text-2xl">{section.label}</h2>
                <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 items-start">
                  {section.entries.map(({ movie, showings }, i) => {
                    const tl = movieTitleLines(movie);
                    const rows = flattenShowingsToRows(showings);
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
                        type="movie"
                        isDubbed={movie.isDubbed}
                        tone="soft"
                        attachShowtimes={Boolean(venueFilter) && hasShowRows}
                        index={i}
                        className="w-full"
                      />
                      {venueFilter && hasShowRows ? (
                      <div className="shrink-0 border-t border-border/[0.1] px-2.5 pb-2 pt-2 text-xs leading-snug text-muted-foreground sm:text-sm">
                        <ShowtimesExpandable listClassName="space-y-1">
                          {rows.map((row) => (
                            <li key={row.key} className="font-body tabular-nums leading-relaxed">
                              <span className="font-semibold tabular-nums text-foreground">{formatShowtimeClock(row.datetime)}</span>
                              {row.hallName ? (
                                <span className="text-muted-foreground">{` · ${row.hallName}`}</span>
                              ) : null}
                            </li>
                          ))}
                        </ShowtimesExpandable>
                      </div>
                      ) : venueFilter && (moviesSection === "new" || moviesSection === "soon") ? (
                        <div className="border-t border-border/[0.1] px-2.5 py-3 text-center text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                          Δεν έχουν καταχωρηθεί προβολές για αυτό το σινεμά.
                        </div>
                      ) : null}
                    </div>
                  );})}
                </motion.div>
              </section>
            ))}
          </div>
        )}

        {!isLoading &&
          !showtimesLoading &&
          !(needsVenueData && venuesLoading) &&
          groupedMovies.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-base">
            <p>
              {venueSlug && !venueFilter && !venuesLoading
                ? "Δεν βρέθηκε ο χώρος του συνδέσμου."
                : venueFilter
                  ? `Δεν βρέθηκαν προβολές στο ${venueFilter.name} για αυτό το φίλτρο.`
                  : areaFilter
                    ? `Δεν βρέθηκαν προβολές στην πόλη «${AREA_LABELS[areaFilter]}»${districtFilter ? ` / ${ATHENS_DISTRICT_LABELS[districtFilter]}` : ""} για αυτό το φίλτρο.`
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