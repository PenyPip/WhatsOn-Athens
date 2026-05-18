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

const sortOptions = [
  { label: "Ημερομηνία", value: "date" },
  { label: "Βαθμολογία", value: "score" },
];

const Movies = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const venueSlug = searchParams.get("venue")?.trim() || "";

  const { data: movies, isLoading } = useMovies();
  const { data: showtimes, isLoading: showtimesLoading } = useShowtimes();
  const { data: venues, isLoading: venuesLoading } = useVenues();
  const { data: cmsGenres } = useMovieGenres();
  const [genreSlug, setGenreSlug] = useState<string | null>(null);
  const [sort, setSort] = useState("date");
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
    let result = genreSlug == null ? [...movies] : movies.filter((m) => m.genreSlug === genreSlug);
    if (sort === "date") result = [...result].sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
    if (sort === "score") result = [...result].sort((a, b) => b.criticScore - a.criticScore);
    return result;
  }, [movies, genreSlug, sort]);

  const venueFilter = useMemo((): StrapiVenue | null => {
    if (!venueSlug || !venues?.length) return null;
    return venues.find((v) => v.slug === venueSlug) ?? null;
  }, [venues, venueSlug]);

  const groupedMovies = useMemo(() => {
    if (!showtimes || !movies) return [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const dayAfterTomorrowStart = new Date(tomorrowStart);
    dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 1);

    const movieMap = new Map<number, StrapiMovie>();
    filteredMovies.forEach((movie) => movieMap.set(movie.id, movie));

    const sections = new Map<string, { label: string; date: Date; movies: StrapiMovie[] }>();
    const seenBySection = new Map<string, Set<number>>();

    showtimes
      .filter((st) => !!st.movieId)
      .filter((st) => !summerOutdoorOnly || showtimeIsSummerOutdoor(st, venues))
      .filter((st) => !venueFilter || showtimeMatchesVenue(st, venueFilter))
      .filter((st) => new Date(st.datetime) >= todayStart)
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
      .forEach((st: StrapiShowtime) => {
        const stDate = new Date(st.datetime);
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

        if (!sections.has(sectionKey)) {
          sections.set(sectionKey, { label: sectionLabel, date: sectionDate, movies: [] });
          seenBySection.set(sectionKey, new Set<number>());
        }

        const movie = st.movieId ? movieMap.get(st.movieId) : undefined;
        if (!movie) return;

        const seenMovies = seenBySection.get(sectionKey);
        if (!seenMovies?.has(movie.id)) {
          sections.get(sectionKey)?.movies.push(movie);
          seenMovies?.add(movie.id);
        }
      });

    return [...sections.values()]
      .map((section) => {
        const sortedMovies = [...section.movies];
        if (sort === "date") {
          sortedMovies.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
        } else if (sort === "score") {
          sortedMovies.sort((a, b) => b.criticScore - a.criticScore);
        }
        return { ...section, movies: sortedMovies };
      })
      .filter((section) => section.movies.length > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [showtimes, movies, filteredMovies, sort, summerOutdoorOnly, venues, venueFilter]);

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
        <div className="flex items-center gap-2 mb-8">
          <span className="text-sm text-muted-foreground uppercase tracking-wider">Ταξινόμηση:</span>
          {sortOptions.map((s) => (
            <button
              key={s.value}
              onClick={() => setSort(s.value)}
              className={`text-sm px-2 py-1 rounded transition-colors ${
                sort === s.value ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
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
                  {section.movies.map((movie, i) => (
                    <div key={`${section.label}-${movie.slug}`} className="flex h-full min-h-0">
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