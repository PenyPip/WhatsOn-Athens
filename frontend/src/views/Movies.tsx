import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import EventCard from "@/components/EventCard";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useMovies, useShowtimes, useVenues } from "@/hooks/useStrapi";
import type { StrapiMovie, StrapiShowtime, StrapiVenue } from "@/lib/api";
import { movieTitleLines } from "@/lib/movieTitles";
import { showtimeIsSummerOutdoor } from "@/lib/homeMovieFilters";

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

const Movies = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const venueSlug = searchParams.get("venue")?.trim() || "";
  const rawArea = searchParams.get("area")?.trim().toLowerCase() ?? "";
  const areaFilter: AreaKey | null =
    rawArea === "athens" || rawArea === "thessaloniki" || rawArea === "other" ? rawArea : null;

  const { data: movies, isLoading } = useMovies();
  const { data: showtimes, isLoading: showtimesLoading } = useShowtimes();
  const { data: venues, isLoading: venuesLoading } = useVenues();
  const [summerOutdoorOnly, setSummerOutdoorOnly] = useState(false);
  const [venueQuery, setVenueQuery] = useState("");

  const venuesSorted = useMemo(
    () => [...(venues ?? [])].sort((a, b) => a.name.localeCompare(b.name, "el")),
    [venues],
  );

  const venuesForChips = useMemo(() => {
    const q = venueQuery.trim().toLowerCase();
    if (!q) return venuesSorted;
    return venuesSorted.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (typeof v.slug === "string" && v.slug.toLowerCase().includes(q)) ||
        (typeof v.address === "string" && v.address.toLowerCase().includes(q)),
    );
  }, [venuesSorted, venueQuery]);

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

    /** sectionKey -> movieId -> venueKey -> μπλοκ προβολών ανά σινεμά */
    const sectionMovieShowings = new Map<string, Map<number, Map<string, VenueShowingsBlock>>>();
    const sectionMeta = new Map<string, { label: string; date: Date }>();

    const filteredSt = showtimes
      .filter((st) => st.movieId != null)
      .filter((st) => !summerOutdoorOnly || showtimeIsSummerOutdoor(st, venues))
      .filter((st) => !venueFilter || showtimeMatchesVenue(st, venueFilter))
      .filter((st) => !areaFilter || showtimeMatchesArea(st, areaFilter, venues))
      .filter((st) => new Date(st.datetime) >= todayStart)
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

    for (const st of filteredSt) {
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
      /** Ίδια λεπτό + ίδια αίθουσα = διπλότυπο από το CMS */
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
  }, [showtimes, movies, summerOutdoorOnly, venues, venueFilter, areaFilter]);

  function clearVenueFilter() {
    setVenueParam(null);
  }

  const needsVenueData = Boolean(venueSlug || areaFilter || summerOutdoorOnly);

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
        {areaFilter && !venueFilter ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/35 px-4 py-3.5 ring-1 ring-border/[0.08]">
            <p className="text-sm md:text-base text-foreground">
              Περιοχή: <strong className="font-semibold">{AREA_LABELS[areaFilter]}</strong>
            </p>
            <button
              type="button"
              onClick={() => setAreaParam(null)}
              className="shrink-0 rounded-lg bg-background/65 px-3 py-2 text-sm font-medium text-foreground shadow-none ring-1 ring-border/10 transition-colors hover:bg-background/85"
            >
              Όλη η Ελλάδα
            </button>
          </div>
        ) : null}

        {venueFilter ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/35 px-4 py-3.5 ring-1 ring-border/[0.08]">
            <p className="text-sm md:text-base text-foreground">
              Προβολές για: <strong className="font-semibold">{venueFilter.name}</strong>
            </p>
            <button
              type="button"
              onClick={clearVenueFilter}
              className="shrink-0 rounded-lg bg-background/65 px-3 py-2 text-sm font-medium text-foreground shadow-none ring-1 ring-border/10 transition-colors hover:bg-background/85"
            >
              Όλοι οι χώροι
            </button>
          </div>
        ) : venueSlug && !venuesLoading ? (
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

        <div className="mb-6 rounded-xl bg-gradient-to-r from-amber-500/[0.04] via-muted/40 to-muted/35 px-4 py-4 md:px-5 md:py-4 ring-1 ring-border/[0.06]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-base font-semibold text-foreground md:text-lg">Θερινό σινεμά</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Εμφάνισε μόνο ταινίες με προβολή που έχουν σήμα «θερινής» στην καταχώρηση ή το venue είναι σημειωμένο ως θερινό.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={summerOutdoorOnly}
              onClick={() => setSummerOutdoorOnly((v) => !v)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-none ring-1 transition-colors ${
                summerOutdoorOnly
                  ? "bg-amber-500/22 text-amber-950 ring-amber-600/35 dark:text-amber-50"
                  : "bg-muted/50 text-muted-foreground ring-transparent hover:bg-muted/65 hover:text-foreground hover:ring-border/15"
              }`}
            >
              <span
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                  summerOutdoorOnly ? "bg-amber-500" : "bg-muted"
                }`}
                aria-hidden
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    summerOutdoorOnly ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </span>
              Μόνο θερινές προβολές
            </button>
          </div>
        </div>

        <div className="mb-3">
          <span className="text-sm text-muted-foreground uppercase tracking-wider">Περιοχή (πόλη)</span>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAreaParam(null)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ring-1 ${
                areaFilter === null && !venueSlug
                  ? "bg-[#13143E] text-white ring-[#13143E]"
                  : "bg-muted/45 text-muted-foreground ring-border/[0.08] hover:bg-muted/60 hover:text-foreground hover:ring-border/25"
              }`}
            >
              Όλα
            </button>
            {(AREA_KEYS as readonly AreaKey[]).map((key) => (
              <button
                type="button"
                key={key}
                onClick={() => setAreaParam(key)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ring-1 ${
                  areaFilter === key && !venueSlug
                    ? "bg-[#13143E] text-white ring-[#13143E]"
                    : "bg-muted/45 text-muted-foreground ring-border/[0.08] hover:bg-muted/60 hover:text-foreground hover:ring-border/25"
                }`}
              >
                {AREA_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <span className="text-sm text-muted-foreground uppercase tracking-wider">Σινεμά</span>
          <div className="relative mt-2 mb-2 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={venueQuery}
              onChange={(e) => setVenueQuery(e.target.value)}
              placeholder="Αναζήτηση σινεμά…"
              autoComplete="off"
              className="w-full rounded-lg border-transparent bg-muted/45 py-2 pl-9 pr-3 text-sm text-foreground shadow-none ring-1 ring-border/10 backdrop-blur-[2px] placeholder:text-muted-foreground focus:bg-background/90 focus:outline-none focus:ring-2 focus:ring-[#13143E]/18"
              aria-label="Αναζήτηση κατά όνομα σινεμά"
            />
          </div>
          {venueQuery.trim() ? (
            <p className="mb-2 text-xs text-muted-foreground">
              {venuesForChips.length === 0
                ? "Δεν βρέθηκε ταύτιση — δοκίμασε άλλο κείμενο."
                : `Εμφάνιση ${venuesForChips.length} από ${venuesSorted.length} χώρους.`}
            </p>
          ) : null}
          <div className="max-h-[min(280px,42vh)] overflow-y-auto rounded-xl bg-muted/30 p-2 ring-1 ring-border/[0.06]">
            <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setVenueParam(null)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ring-1 ${
                !venueSlug
                  ? "bg-[#13143E] text-white ring-[#13143E]"
                  : "bg-muted/45 text-muted-foreground ring-border/[0.08] hover:bg-muted/60 hover:text-foreground hover:ring-border/25"
              }`}
            >
              Όλα
            </button>
            {venuesForChips.map((v) => (
              <button
                type="button"
                key={v.id}
                onClick={() => setVenueParam(v.slug)}
                className={`max-w-[200px] truncate px-4 py-1.5 rounded-md text-sm font-medium transition-colors ring-1 ${
                  venueSlug === v.slug
                    ? "bg-[#13143E] text-white ring-[#13143E]"
                    : "bg-muted/45 text-muted-foreground ring-border/[0.08] hover:bg-muted/60 hover:text-foreground hover:ring-border/25"
                }`}
                title={v.name}
              >
                {v.name}
              </button>
            ))}
            </div>
          </div>
        </div>

        {venueSlug ? (
          <p className="mb-4 text-xs text-muted-foreground">
            Με επιλεγμένο σινεμά, το φίλτρο <span className="font-medium text-foreground/80">περιοχής</span> δεν
            εφαρμόζεται (το URL απλοποιείται σε έναν χώρο).
          </p>
        ) : null}
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
                        attachShowtimes
                        index={i}
                        className="w-full"
                      />
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