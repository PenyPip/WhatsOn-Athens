import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import EventCard from "@/components/EventCard";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMovies, useShowtimes, useVenues } from "@/hooks/useStrapi";
import type { StrapiMovie, StrapiShowtime, StrapiVenue } from "@/lib/api";
import { movieTitleLines } from "@/lib/movieTitles";
import {
  showtimeIsSummerOutdoor,
  showtimeMatchesHomeToday,
  showtimeMatchesHomeThisWeek,
  showtimeMatchesHomeSummerCinemaRow,
  showtimeIsUpcoming,
  moviesReleasedInLastDays,
  moviesWithFutureReleaseDate,
} from "@/lib/homeMovieFilters";

const MOVIES_SECTION_QUERY_KEYS = ["today", "week", "summer", "new", "soon"] as const;
export type MoviesUrlSectionKey = (typeof MOVIES_SECTION_QUERY_KEYS)[number];

function parseMoviesSectionParam(raw: string | null): MoviesUrlSectionKey | null {
  const v = raw?.trim().toLowerCase() ?? "";
  return (MOVIES_SECTION_QUERY_KEYS as readonly string[]).includes(v) ? (v as MoviesUrlSectionKey) : null;
}

const MOVIES_SECTION_BANNER: Record<MoviesUrlSectionKey, string> = {
  today: "Φιλτράρισμα: Ταινίες σήμερα",
  week: "Φιλτράρισμα: Ταινίες της εβδομάδας (Δευ–Κυρ)",
  summer: "Φιλτράρισμα: Θερινές προβολές (εβδομάδα σινεμά)",
  new: "Φιλτράρισμα: Τελευταίες κυκλοφορίες (10 μέρες)",
  soon: "Φιλτράρισμα: Προσεχώς (ημερομηνία κυκλοφορίας μετά από σήμερα)",
};

const AREA_KEYS = ["athens", "thessaloniki", "other"] as const;
type AreaKey = (typeof AREA_KEYS)[number];

const AREA_LABELS: Record<AreaKey, string> = {
  athens: "Αθήνα",
  thessaloniki: "Θεσσαλονίκη",
  other: "Άλλο",
};

function normalizeVenueCity(c: string | undefined): string {
  const s = (c ?? "").trim().toLowerCase();
  return AREA_KEYS.includes(s as AreaKey) ? s : "";
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

function venueLabelFromShowtime(st: StrapiShowtime, venues: StrapiVenue[] | undefined): string {
  if (venues?.length && st.venueId != null) {
    const v = venues.find((x) => Number(x.id) === Number(st.venueId));
    if (typeof v?.name === "string" && v.name.trim()) return v.name.trim();
  }
  const vn = typeof st.venue === "string" ? st.venue.trim() : "";
  if (vn) return vn;
  return "Άγνωστος χώρος";
}

/** Ένα κλειδί ανά φυσικό σινεμά — ώστε να μην εμφανίζονται πολλές γραμμές για τον ίδιο χώρο. */
function stableVenueKey(st: StrapiShowtime, venues: StrapiVenue[] | undefined): string {
  if (st.venueId != null) return `v:${Number(st.venueId)}`;
  const vn = typeof st.venue === "string" ? st.venue.trim() : "";
  if (venues?.length && vn) {
    const byName = venues.filter((x) => x.name.trim() === vn);
    if (byName.length === 1) return `v:${byName[0].id}`;
  }
  const label = venueLabelFromShowtime(st, venues);
  return `n:${label.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

function formatShowtimeClock(d: Date): string {
  return d.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

const MOVIES_PREVIEW_COUNT = 3;

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

/** Στην προβολή «όλοι οι χώροι»: οι πρώτες μέχρι 3 είναι από διαφορετικά σινεμά · με συγκεκριμένο χώρο, απλά οι πρώτες ώρες. */
function splitPreviewAndRest(rows: ShowingRow[], singleVenueOnly: boolean): { preview: ShowingRow[]; rest: ShowingRow[] } {
  if (singleVenueOnly) {
    return {
      preview: rows.slice(0, MOVIES_PREVIEW_COUNT),
      rest: rows.slice(MOVIES_PREVIEW_COUNT),
    };
  }
  const preview: ShowingRow[] = [];
  const rest: ShowingRow[] = [];
  const seenVenueKey = new Set<string>();
  for (const row of rows) {
    if (preview.length < MOVIES_PREVIEW_COUNT) {
      if (seenVenueKey.has(row.venueKey)) {
        rest.push(row);
      } else {
        preview.push(row);
        seenVenueKey.add(row.venueKey);
      }
    } else {
      rest.push(row);
    }
  }
  return { preview, rest };
}

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
  const moviesSection = parseMoviesSectionParam(searchParams.get("section"));

  const clearMoviesSectionParam = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("section");
    setSearchParams(next);
  };

  const { data: movies, isLoading } = useMovies();
  const { data: showtimes, isLoading: showtimesLoading } = useShowtimes();
  const { data: venues, isLoading: venuesLoading } = useVenues();
  const [summerOutdoorOnly, setSummerOutdoorOnly] = useState(false);

  const venuesSorted = useMemo(
    () => [...(venues ?? [])].sort((a, b) => a.name.localeCompare(b.name, "el")),
    [venues],
  );

  const venueSelectValue = useMemo(() => {
    if (!venueSlug) return FILTER_ALL;
    const hit = venuesSorted.find((v) => v.slug === venueSlug);
    return hit ? hit.slug : FILTER_ALL;
  }, [venueSlug, venuesSorted]);

  const setAreaParam = (key: AreaKey | null) => {
    const next = new URLSearchParams(searchParams);
    next.delete("venue");
    if (key) next.set("area", key);
    else next.delete("area");
    setSearchParams(next);
  };

  const setVenueParam = (slug: string | null) => {
    const next = new URLSearchParams(searchParams);
    next.delete("area");
    if (slug) next.set("venue", slug);
    else next.delete("venue");
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
    (movies ?? []).forEach((movie) => movieMap.set(movie.id, movie));

    const baseSt = showtimes
      .filter((st) => st.movieId != null)
      .filter((st) => !summerOutdoorOnly || showtimeIsSummerOutdoor(st, venues))
      .filter((st) => !venueFilter || showtimeMatchesVenue(st, venueFilter))
      .filter((st) => !areaFilter || showtimeMatchesArea(st, areaFilter, venues))
      .filter((st) => showtimeIsUpcoming(st, now))
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

    let programSt = baseSt;
    if (moviesSection === "today") {
      programSt = programSt.filter((st) => showtimeMatchesHomeToday(st, now));
    } else if (moviesSection === "week") {
      programSt = programSt.filter((st) => showtimeMatchesHomeThisWeek(st, now));
    } else if (moviesSection === "summer") {
      programSt = programSt.filter((st) => showtimeMatchesHomeSummerCinemaRow(st, venues, now));
    }

    if (moviesSection === "new" || moviesSection === "soon") {
      const subset =
        moviesSection === "new"
          ? moviesReleasedInLastDays(movies ?? [], 10, now)
          : moviesWithFutureReleaseDate(movies ?? [], now);
      if (subset.length === 0) return [];

      const ids = new Set(subset.map((m) => m.id));

      const byMovieVenues = new Map<number, Map<string, VenueShowingsBlock>>();
      const stSubset = baseSt.filter((st) => ids.has(Number(st.movieId)));

      for (const st of stSubset) {
        const stDate = new Date(st.datetime);
        if (Number.isNaN(stDate.getTime())) continue;
        const movie = movieMap.get(Number(st.movieId));
        if (!movie) continue;

        const hallRaw = typeof st.hallName === "string" ? st.hallName.trim() : "";
        const venueLabel = venueLabelFromShowtime(st, venues);
        const venueKey = stableVenueKey(st, venues);
        const slotDedupeKey = `${Math.floor(stDate.getTime() / 60000)}-${hallRaw}`;

        if (!byMovieVenues.has(movie.id)) byMovieVenues.set(movie.id, new Map());
        const byVenue = byMovieVenues.get(movie.id)!;

        if (!byVenue.has(venueKey)) {
          byVenue.set(venueKey, { key: venueKey, venueLabel, slots: [] });
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
          label: moviesSection === "new" ? "Τελευταίες κυκλοφορίες" : "Προσεχώς",
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
      const venueLabel = venueLabelFromShowtime(st, venues);
      const venueKey = stableVenueKey(st, venues);
      const slotDedupeKey = `${Math.floor(stDate.getTime() / 60000)}-${hallRaw}`;

      if (!sectionMovieShowings.has(sectionKey)) {
        sectionMovieShowings.set(sectionKey, new Map());
      }
      const byMovie = sectionMovieShowings.get(sectionKey)!;
      if (!byMovie.has(movie.id)) byMovie.set(movie.id, new Map());
      const byVenue = byMovie.get(movie.id)!;

      if (!byVenue.has(venueKey)) {
        byVenue.set(venueKey, { key: venueKey, venueLabel, slots: [] });
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
  }, [showtimes, movies, summerOutdoorOnly, venues, venueFilter, areaFilter, moviesSection]);

  function clearVenueFilter() {
    setVenueParam(null);
  }

  const needsVenueData = Boolean(venueSlug || areaFilter || summerOutdoorOnly || moviesSection === "summer");

  return (
    <div className="min-h-screen pt-36 pb-20 md:pb-8">
      <div className="section-black py-10 -mt-28 pt-36 mb-8">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">Ταινίες</h1>
            <p className="text-white/60 text-base">Τώρα στα σινεμά σε όλη την Ελλάδα</p>
          </motion.div>
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

        <div className="mb-6 rounded-xl border border-border/15 bg-muted/25 px-4 py-5 ring-1 ring-border/[0.06] md:px-5">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Φίλτρα</p>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/10 bg-background/40 px-3 py-3 transition-colors hover:bg-background/65">
            <input
              type="checkbox"
              checked={summerOutdoorOnly}
              onChange={() => setSummerOutdoorOnly((x) => !x)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input text-[#13143E] accent-[#13143E] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span>
              <span className="text-sm font-medium text-foreground">Μόνο θερινές προβολές</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                Προβολή με σήμα θερινής στο CMS ή venue σημειωμένο ως θερινό.
              </span>
            </span>
          </label>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground" id="movies-filter-area-label">
                Περιοχή
              </span>
              <Select
                value={areaFilter ?? FILTER_ALL}
                onValueChange={(v) => setAreaParam(v === FILTER_ALL ? null : (v as AreaKey))}
                disabled={venuesLoading || Boolean(venueFilter)}
              >
                <SelectTrigger aria-labelledby="movies-filter-area-label" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={FILTER_ALL}>Όλη η Ελλάδα</SelectItem>
                  {(AREA_KEYS as readonly AreaKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {AREA_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground" id="movies-filter-venue-label">
                Σινεμά
              </span>
              <Select
                value={venueSelectValue}
                onValueChange={(v) => setVenueParam(v === FILTER_ALL ? null : v)}
                disabled={venuesLoading}
              >
                <SelectTrigger aria-labelledby="movies-filter-venue-label" className="w-full">
                  <SelectValue placeholder="Όλα τα σινεμά" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={FILTER_ALL}>Όλα τα σινεμά</SelectItem>
                  {venuesSorted.map((v) => (
                    <SelectItem key={v.id} value={v.slug}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {venueFilter ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Το φίλτρο περιοχής είναι αδρανές όταν έχεις επιλέξει συγκεκριμένο σινεμά.
            </p>
          ) : null}
        </div>

        {isLoading || showtimesLoading || (needsVenueData && venuesLoading) ? (
          <LoadingState message="Φόρτωση ταινιών..." />
        ) : (
          <div className="space-y-10">
            {groupedMovies.map((section) => (
              <section key={section.label}>
                <h2 className="font-display text-2xl font-semibold mb-4 capitalize">{section.label}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 items-stretch">
                  {section.entries.map(({ movie, showings }, i) => {
                    const tl = movieTitleLines(movie);
                    const rows = flattenShowingsToRows(showings);
                    const hasShowRows = rows.length > 0;
                    const { preview, rest } = splitPreviewAndRest(rows, Boolean(venueFilter));
                    return (
                    <div
                      key={`${section.label}-${movie.slug}`}
                      className="group/movie-stack flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-muted/30 ring-1 ring-border/[0.1] transition-[box-shadow] hover:shadow-[0_10px_32px_rgba(28,29,98,0.1)] hover:ring-border/[0.18]"
                    >
                      <EventCard
                        slug={movie.slug}
                        title={tl.primary}
                        titleSecondary={tl.secondary}
                        subtitle={movie.director ?? ""}
                        genre={movie.genre}
                        duration={movie.duration}
                        score={movie.criticScore}
                        posterUrl={movie.posterUrl}
                        type="movie"
                        tone="soft"
                        attachShowtimes={hasShowRows}
                        index={i}
                        className="w-full"
                      />
                      {hasShowRows ? (
                      <div className="flex min-h-0 flex-1 flex-col justify-start border-t border-border/[0.1] px-2.5 pb-2 pt-2 text-xs leading-snug text-muted-foreground sm:text-sm">
                        <ul className="space-y-1">
                          {preview.map((row) => (
                            <li key={row.key} className="font-body tabular-nums leading-relaxed">
                              <span className="font-semibold tabular-nums text-foreground">{formatShowtimeClock(row.datetime)}</span>
                              {venueFilter ? (
                                row.hallName ? (
                                  <span className="text-muted-foreground">{` · ${row.hallName}`}</span>
                                ) : null
                              ) : (
                                <>
                                  <span className="text-muted-foreground">{` · ${row.venueLabel}`}</span>
                                  {row.hallName ? (
                                    <span className="text-muted-foreground/90">{` · ${row.hallName}`}</span>
                                  ) : null}
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                        {rest.length > 0 ? (
                          <details className="group mt-2 shrink-0 border-t border-transparent pt-2">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground outline-none ring-offset-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                              <span>{`Ακόμα ${rest.length} προβολή${rest.length === 1 ? "" : "ες"}`}</span>
                              <ChevronDown
                                aria-hidden
                                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                              />
                            </summary>
                            <ul className="mt-2 space-y-1 border-l-2 border-border/[0.12] pl-2">
                              {rest.map((row) => (
                                <li key={row.key} className="font-body tabular-nums leading-relaxed">
                                  <span className="font-semibold tabular-nums text-foreground">
                                    {formatShowtimeClock(row.datetime)}
                                  </span>
                                  {venueFilter ? (
                                    row.hallName ? (
                                      <span className="text-muted-foreground">{` · ${row.hallName}`}</span>
                                    ) : null
                                  ) : (
                                    <>
                                      <span className="text-muted-foreground">{` · ${row.venueLabel}`}</span>
                                      {row.hallName ? (
                                        <span className="text-muted-foreground/90">{` · ${row.hallName}`}</span>
                                      ) : null}
                                    </>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : null}
                      </div>
                      ) : moviesSection === "new" || moviesSection === "soon" ? (
                        <div className="border-t border-border/[0.1] px-2.5 py-3 text-center text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                          Δεν έχουν καταχωρηθεί προβολές από σήμερα για αυτό το φίλτρο χώρου / θερινό.
                        </div>
                      ) : null}
                    </div>
                  );})}
                </div>
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
                    ? `Δεν βρέθηκαν προβολές στην περιοχή «${AREA_LABELS[areaFilter]}» για αυτό το φίλτρο.`
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