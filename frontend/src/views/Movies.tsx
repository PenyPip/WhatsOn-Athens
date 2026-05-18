import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import EventCard from "@/components/EventCard";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useMovies, useShowtimes, useMovieGenres, useVenues } from "@/hooks/useStrapi";
import type { StrapiMovie, StrapiShowtime, StrapiVenue } from "@/lib/api";
import { showtimeIsSummerOutdoor } from "@/lib/homeMovieFilters";

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

function formatShowtimeClock(d: Date): string {
  return d.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" });
}

type ShowingLine = {
  key: string;
  datetime: Date;
  venueLabel: string;
  hallName?: string;
};

type MovieDayEntry = {
  movie: StrapiMovie;
  showings: ShowingLine[];
};

type DaySection = {
  label: string;
  date: Date;
  entries: MovieDayEntry[];
};

const Movies = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const venueSlug = searchParams.get("venue")?.trim() || "";

  const { data: movies, isLoading } = useMovies();
  const { data: showtimes, isLoading: showtimesLoading } = useShowtimes();
  const { data: venues, isLoading: venuesLoading } = useVenues();
  const { data: cmsGenres } = useMovieGenres();
  const [genreSlug, setGenreSlug] = useState<string | null>(null);
  const [summerOutdoorOnly, setSummerOutdoorOnly] = useState(false);

  const genreFilters = useMemo(() => {
    if (cmsGenres?.length) return cmsGenres.map((g) => ({ slug: g.slug, label: g.label }));
    const seen = new Map<string, string>();
    for (const m of movies ?? []) {
      if (m.genreSlug && m.genre) seen.set(m.genreSlug, m.genre);
    }
    return [...seen.entries()].map(([slug, label]) => ({ slug, label }));
  }, [cmsGenres, movies]);

  const filteredMovies = useMemo(() => {
    if (!movies) return [];
    return genreSlug == null ? [...movies] : movies.filter((m) => m.genreSlug === genreSlug);
  }, [movies, genreSlug]);

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
    filteredMovies.forEach((movie) => movieMap.set(movie.id, movie));

    /** sectionKey -> movieId -> ShowingLine[] με αποφυγή διπλότυπων */
    const sectionMovieShowings = new Map<string, Map<number, ShowingLine[]>>();
    const sectionMeta = new Map<string, { label: string; date: Date }>();

    const filteredSt = showtimes
      .filter((st) => st.movieId != null)
      .filter((st) => !summerOutdoorOnly || showtimeIsSummerOutdoor(st, venues))
      .filter((st) => !venueFilter || showtimeMatchesVenue(st, venueFilter))
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
      const dedupeKey = `${stDate.getTime()}-${venueLabel}-${hallRaw}`;

      if (!sectionMovieShowings.has(sectionKey)) {
        sectionMovieShowings.set(sectionKey, new Map());
      }
      const byMovie = sectionMovieShowings.get(sectionKey)!;
      if (!byMovie.has(movie.id)) byMovie.set(movie.id, []);

      const list = byMovie.get(movie.id)!;
      if (list.some((x) => x.key === dedupeKey)) continue;
      list.push({
        key: dedupeKey,
        datetime: stDate,
        venueLabel,
        hallName: hallRaw || undefined,
      });
    }

    const sections: DaySection[] = [...sectionMovieShowings.keys()].map((key) => {
      const meta = sectionMeta.get(key)!;
      const byMovie = sectionMovieShowings.get(key)!;
      const entries: MovieDayEntry[] = [...byMovie.entries()].map(([mid, lines]) => {
        const mv = movieMap.get(mid)!;
        const sorted = [...lines].sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
        return { movie: mv, showings: sorted };
      });

      entries.sort((a, b) => {
        const ta = a.showings[0]?.datetime.getTime() ?? 0;
        const tb = b.showings[0]?.datetime.getTime() ?? 0;
        return ta - tb;
      });

      return { label: meta.label, date: meta.date, entries };
    });

    return sections.filter((s) => s.entries.length > 0).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [showtimes, movies, filteredMovies, summerOutdoorOnly, venues, venueFilter]);

  function clearVenueFilter() {
    const next = new URLSearchParams(searchParams);
    next.delete("venue");
    setSearchParams(next);
  }

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
        {venueFilter ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-4">
            <p className="text-sm md:text-base text-foreground">
              Προβολές για: <strong className="font-semibold">{venueFilter.name}</strong>
            </p>
            <button
              type="button"
              onClick={clearVenueFilter}
              className="shrink-0 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/80"
            >
              Όλοι οι χώροι
            </button>
          </div>
        ) : venueSlug && !venuesLoading ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/35 bg-amber-950/15 px-4 py-4">
            <p className="text-sm text-amber-100/90">Ο σύνδεσμος χώρου δεν αντιστοιχεί σε καταχωρημένο venue.</p>
            <button
              type="button"
              onClick={clearVenueFilter}
              className="shrink-0 rounded-lg border border-amber-500/40 bg-black/40 px-3 py-2 text-sm font-medium text-amber-50 hover:bg-black/55"
            >
              Επαναφορά
            </button>
          </div>
        ) : null}

        <div className="mb-6 rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/[0.08] via-transparent to-transparent px-4 py-4 md:px-5 md:py-4">
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
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors ${
                summerOutdoorOnly
                  ? "border-amber-400/70 bg-amber-500/20 text-amber-950 dark:text-amber-100"
                  : "border-border bg-card text-muted-foreground hover:border-amber-500/40 hover:text-foreground"
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

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground mr-1 uppercase tracking-wider">Είδος:</span>
          <button
            type="button"
            onClick={() => setGenreSlug(null)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all border ${
              genreSlug === null
                ? "bg-[#13143E] text-white border-[#13143E]"
                : "bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground"
            }`}
          >
            Όλα
          </button>
          {genreFilters.map(({ slug, label }) => (
            <button
              type="button"
              key={slug}
              onClick={() => setGenreSlug(slug)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-all border ${
                genreSlug === slug
                  ? "bg-[#13143E] text-white border-[#13143E]"
                  : "bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {isLoading || showtimesLoading || (summerOutdoorOnly && venuesLoading) || (!!venueSlug && venuesLoading) ? (
          <LoadingState message="Φόρτωση ταινιών..." />
        ) : (
          <div className="space-y-10">
            {groupedMovies.map((section) => (
              <section key={section.label}>
                <h2 className="font-display text-2xl font-semibold mb-4 capitalize">{section.label}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 items-stretch">
                  {section.entries.map(({ movie, showings }, i) => (
                    <div key={`${section.label}-${movie.slug}`} className="flex flex-col gap-2 h-full min-h-0">
                      <div className="flex min-h-0 flex-1">
                        <EventCard
                          slug={movie.slug}
                          title={movie.title}
                          subtitle={movie.director ?? ""}
                          genre={movie.genre}
                          duration={movie.duration}
                          score={movie.criticScore}
                          posterUrl={movie.posterUrl}
                          type="movie"
                          index={i}
                          className="w-full flex-1"
                        />
                      </div>
                      <ul className="shrink-0 space-y-1 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-2 text-[11px] leading-snug text-muted-foreground">
                        {showings.map((line) => {
                          const time = formatShowtimeClock(line.datetime);
                          const where = venueFilter
                            ? line.hallName
                              ? `${line.hallName}`
                              : null
                            : `${line.venueLabel}${line.hallName ? ` · ${line.hallName}` : ""}`;
                          return (
                            <li key={line.key} className="font-body tabular-nums">
                              <span className="font-medium text-foreground">{time}</span>
                              {where ? <span className="text-muted-foreground">{` · ${where}`}</span> : null}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {!isLoading &&
          !showtimesLoading &&
          !(summerOutdoorOnly && venuesLoading) &&
          !(!!venueSlug && venuesLoading) &&
          groupedMovies.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-base">
            <p>
              {venueSlug && !venueFilter && !venuesLoading
                ? "Δεν βρέθηκε ο χώρος του συνδέσμου."
                : venueFilter
                  ? `Δεν βρέθηκαν προβολές στο ${venueFilter.name} για αυτό το φίλτρο.`
                  : summerOutdoorOnly
                    ? "Δεν βρέθηκαν μελλοντικές προβολές σε θερινούς χώρους για αυτό το φίλτρο είδους."
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