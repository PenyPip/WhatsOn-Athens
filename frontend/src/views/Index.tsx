import { Link } from "react-router-dom";
import Hero from "@/components/Hero";
import HorizontalScroll from "@/components/HorizontalScroll";
import EventCard from "@/components/EventCard";
import RestaurantCard from "@/components/RestaurantCard";
import LoadingState from "@/components/LoadingState";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Fragment, useMemo } from "react";
import { useMovies, useShowtimes, useTheaterShows, useRestaurants, useHomeLayout, useVenues } from "@/hooks/useStrapi";
import type { HomeSectionId } from "@/config/home";
import type { StrapiMovie } from "@/lib/api";
import { movieTitleLines } from "@/lib/movieTitles";
import {
  moviesReleasedInLastDays,
  moviesWithFutureReleaseDate,
  moviesWithSummerOutdoorShowtimeThisCinemaWeek,
  moviesWithShowtimeThisWeek,
  moviesWithShowtimeToday,
  summerVenuesWithShowtimesOrAll,
} from "@/lib/homeMovieFilters";
import VenueCard from "@/components/VenueCard";

const summerStrip = [
  "Θερινό σινεμά",
  "Περιοδείες ανά την Ελλάδα",
  "Θέατρο καλοκαιριού",
  "Ξανά στη σκηνή",
];

function MovieRowScroll({
  loading,
  loadingMessage,
  items,
  emptyMessage,
  fetchErrorMessage,
  spotlight,
  muted,
  eyebrow,
  title,
  subtitle,
  /** `/movies?section=…` — ίδιο φίλτρο με την ενότητα της αρχικής */
  moviesMoreHref,
}: {
  loading: boolean;
  loadingMessage: string;
  items: StrapiMovie[];
  emptyMessage?: string;
  /** Όταν το query αποτύχει (δίκτυο/403) — όχι «κενό CMS». */
  fetchErrorMessage?: string;
  spotlight?: boolean;
  muted?: boolean;
  eyebrow: string;
  title: string;
  subtitle?: string;
  moviesMoreHref?: string;
}) {
  if (loading) {
    return <LoadingState message={loadingMessage} />;
  }
  if (fetchErrorMessage) {
    return (
      <section className="relative section-black py-12 md:py-16 border-y border-white/[0.07]">
        <div className="container max-w-7xl">
          <div className="max-w-xl rounded-xl border border-amber-500/25 bg-amber-950/20 px-5 py-5 md:px-6 md:py-6">
            <p className="font-display text-lg tracking-tight text-amber-100">{title}</p>
            <p className="mt-3 text-sm leading-relaxed text-amber-100/80 font-body">{fetchErrorMessage}</p>
          </div>
        </div>
      </section>
    );
  }
  if (items.length === 0) {
    return (
      <section className="relative section-black py-12 md:py-16 border-y border-white/[0.07]">
        <div className="container max-w-7xl">
          <div className="max-w-xl rounded-xl border border-white/10 bg-black/35 px-5 py-5 md:px-6 md:py-6">
            <p className="font-display text-lg tracking-tight text-white">{title}</p>
            {emptyMessage ? (
              <p className="mt-3 text-sm leading-relaxed text-white/55 font-body">{emptyMessage}</p>
            ) : null}
          </div>
        </div>
      </section>
    );
  }
  return (
    <>
      <HorizontalScroll spotlight={spotlight} muted={muted} eyebrow={eyebrow} title={title} subtitle={subtitle}>
        {items.map((movie, i) => {
          const tl = movieTitleLines(movie);
          return (
          <div
            key={`${movie.id}-${movie.slug}`}
            className="flex h-full min-h-0 min-w-[170px] max-w-[170px] flex-shrink-0 md:min-w-[200px] md:max-w-[200px]"
          >
            <EventCard
              slug={movie.slug}
              title={tl.primary}
              titleSecondary={tl.secondary}
              subtitle={movie.director}
              genre={movie.genre}
              duration={movie.duration}
              score={movie.criticScore}
              posterUrl={movie.posterUrl}
              type="movie"
              index={i}
              className="w-full flex-1"
            />
          </div>
        );})}
      </HorizontalScroll>
      {moviesMoreHref && items.length > 0 ? (
        <div
          className={
            muted
              ? "relative border-b border-border/40 bg-muted/[0.12] pb-12 pt-4 text-center"
              : spotlight
                ? "section-black relative border-b border-white/10 pb-12 pt-5 text-center"
                : "section-black relative border-b border-white/10 pb-12 pt-5 text-center"
          }
        >
          <div className="container relative z-[1] max-w-7xl">
            <Link
              to={moviesMoreHref}
              className={
                spotlight || !muted
                  ? "inline-flex text-sm font-semibold tracking-tight text-amber-100/95 underline underline-offset-4 hover:text-white"
                  : "inline-flex text-sm font-semibold text-[#13143E] underline underline-offset-4 hover:text-[#13143E]/85 dark:text-white/85 dark:hover:text-white"
              }
            >
              Δες περισσότερα
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
};

const Index = () => {
  const layout = useHomeLayout();
  const { data: movies, isLoading: moviesLoading, isError: moviesError } = useMovies();
  const { data: showtimes, isLoading: showtimesLoading, isError: showtimesError } = useShowtimes();
  const { data: venues, isLoading: venuesLoading, isError: venuesError } = useVenues();
  const { data: theaterShows, isLoading: theaterLoading, isError: theaterError } = useTheaterShows();
  const { data: restaurants, isLoading: restaurantsLoading, isError: restaurantsError } = useRestaurants();

  const apiSectionFailed = moviesError || showtimesError || venuesError || theaterError || restaurantsError;

  const movieList = useMemo(() => movies ?? [], [movies]);
  const stList = useMemo(() => showtimes ?? [], [showtimes]);

  const venueList = useMemo(() => venues ?? [], [venues]);

  /** Αρχικά «Νέα μέρη»: αν κανένα δεν είναι is_new, δείξε έως 12 για να μην μένει κενή η ενότητα. */
  const diningToShow = useMemo(() => {
    const all = restaurants ?? [];
    const flagged = all.filter((r) => r.isNew);
    return flagged.length > 0 ? flagged : all.slice(0, 12);
  }, [restaurants]);

  const summerVenuesForHome = useMemo(
    () => summerVenuesWithShowtimesOrAll(venueList, stList),
    [venueList, stList],
  );
  const summerMoviesForHome = useMemo(
    () => moviesWithSummerOutdoorShowtimeThisCinemaWeek(movieList, stList, venueList),
    [movieList, stList, venueList],
  );
  const weekMovies = useMemo(() => moviesWithShowtimeThisWeek(movieList, stList), [movieList, stList]);
  const todayMovies = useMemo(() => moviesWithShowtimeToday(movieList, stList), [movieList, stList]);
  const newMoviesList = useMemo(() => moviesReleasedInLastDays(movieList, 10), [movieList]);
  const comingSoonMovies = useMemo(() => moviesWithFutureReleaseDate(movieList), [movieList]);

  const sectionEl = (id: HomeSectionId, node: ReactNode) => <Fragment key={id}>{node}</Fragment>;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {apiSectionFailed ? (
        <div className="section-black border-b border-amber-500/30 bg-amber-950/25 px-4 py-3 md:py-4">
          <div className="container max-w-7xl text-center text-sm text-amber-100/90 font-body md:text-left md:text-[0.9375rem]">
            Μερικά δεδομένα δεν φορτώθηκαν. Δοκίμασε να ανανεώσεις τη σελίδα.
          </div>
        </div>
      ) : null}
      {layout.sections.map((id) => {
        switch (id) {
          case "hero":
            return sectionEl("hero", <Hero />);
          case "strip":
            return sectionEl(
              "strip",
              <div className="section-black py-3">
                <div className="container max-w-7xl flex items-center gap-8 overflow-x-auto scrollbar-hide text-xs font-body uppercase tracking-[0.15em]">
                  <span className="text-amber-200/85 flex-shrink-0">Καλοκαίρι:</span>
                  {summerStrip.map((t) => (
                    <span
                      key={t}
                      className="text-white/70 hover:text-white cursor-pointer transition-colors flex-shrink-0"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>,
            );
          case "movies_today":
            return sectionEl(
              "movies_today",
              <MovieRowScroll
                loading={moviesLoading || showtimesLoading}
                loadingMessage="Φόρτωση προβολών της ημέρας..."
                fetchErrorMessage={
                  moviesError || showtimesError ? "Δεν ήταν δυνατή η φόρτωση." : undefined
                }
                items={todayMovies}
                muted
                eyebrow="Σήμερα"
                title="Ταινίες σήμερα"
                moviesMoreHref="/movies?section=today"
              />,
            );
          case "summer_cinema":
            return sectionEl(
              "summer_cinema",
              <MovieRowScroll
                loading={moviesLoading || showtimesLoading || venuesLoading}
                loadingMessage="Φόρτωση θερινών προβολών..."
                fetchErrorMessage={
                  moviesError || showtimesError || venuesError ? "Δεν ήταν δυνατή η φόρτωση." : undefined
                }
                items={summerMoviesForHome}
                spotlight
                eyebrow="Καλοκαίρι · θερινές προβολές"
                title="Θερινά σινεμά"
                subtitle="Θερινές προβολές της εβδομάδας"
                moviesMoreHref="/movies?section=summer"
              />,
            );
          case "summer_venues":
            return sectionEl(
              "summer_venues",
              <>
                {venuesLoading ? (
                  <LoadingState message="Φόρτωση θερινών χώρων..." />
                ) : venuesError ? (
                  <section className="relative section-black border-y border-white/[0.07] py-12 md:py-16">
                    <div className="container max-w-7xl">
                      <div className="max-w-xl rounded-xl border border-amber-500/25 bg-amber-950/20 px-5 py-5 md:px-6 md:py-6">
                        <p className="font-display text-lg tracking-tight text-amber-100">Τα θερινά σινεμά</p>
                        <p className="mt-3 text-sm leading-relaxed text-amber-100/80 font-body">
                          Δεν ήταν δυνατή η φόρτωση των χώρων.
                        </p>
                      </div>
                    </div>
                  </section>
                ) : summerVenuesForHome.length === 0 ? (
                  <section className="relative section-black border-y border-white/[0.07] py-12 md:py-16">
                    <div className="container max-w-7xl">
                      <div className="max-w-xl rounded-xl border border-white/10 bg-black/35 px-5 py-5 md:px-6 md:py-6">
                        <p className="font-display text-lg tracking-tight text-white">Τα θερινά σινεμά</p>
                        <p className="mt-3 text-sm leading-relaxed text-white/55 font-body">
                          Δεν υπάρχουν θερινοί χώροι προς το παρόν.
                        </p>
                      </div>
                    </div>
                  </section>
                ) : (
                  <section className="relative section-black overflow-hidden border-y border-white/[0.07] py-10 md:py-14">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-20 top-0 h-56 w-56 rounded-full bg-amber-500/15 blur-[90px]"
                    />
                    <div className="relative z-[1] container max-w-7xl">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45 }}
                      >
                        <span className="mb-2 block font-body text-[10px] uppercase tracking-[0.22em] text-amber-300/95">
                          Χώροι
                        </span>
                        <h2 className="font-display text-3xl font-bold leading-tight text-white md:text-4xl md:leading-[1.12]">
                          Τα θερινά σινεμά
                        </h2>
                      </motion.div>

                      <ul
                        className="mt-8 grid list-none grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3"
                        aria-label="Λίστα θερινών σινεμά"
                      >
                        {summerVenuesForHome.map((venue, i) => (
                          <li key={venue.id}>
                            <motion.div
                              initial={{ opacity: 0, y: 14 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true, margin: "-40px" }}
                              transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.25), ease: [0.25, 0.46, 0.45, 0.94] }}
                              className="h-full"
                            >
                              <VenueCard
                                venue={venue}
                                variant="spotlight"
                                layout="grid"
                                compact
                                moviesHref={`/movies?venue=${encodeURIComponent(venue.slug)}`}
                              />
                            </motion.div>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-10 border-t border-white/10 pt-8 text-center">
                        <a
                          href="/venues"
                          className="inline-flex items-center gap-1 text-sm font-semibold text-amber-200/95 transition-colors hover:text-amber-50"
                        >
                          Δες όλους τους χώρους
                          <span aria-hidden className="opacity-75">
                            →
                          </span>
                        </a>
                      </div>
                    </div>
                  </section>
                )}
              </>,
            );
          case "tours":
            return sectionEl(
              "tours",
              <div className="section-black relative overflow-hidden py-14 md:py-20">
                <div aria-hidden className="pointer-events-none absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-amber-500/10 blur-[90px]" />
                <div className="container relative z-[1] max-w-7xl">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                  >
                    <span className="mb-2 block font-body text-[10px] uppercase tracking-[0.24em] text-amber-200/85">
                      Σεζόν & περιοδική κίνηση
                    </span>
                    <h2 className="font-display text-3xl font-bold leading-tight text-white md:text-5xl md:leading-[1.1]">
                      Περιοδείες & παραστάσεις που ταξιδεύουν
                    </h2>
                  </motion.div>
                  {theaterLoading ? (
                    <LoadingState message="Φόρτωση παραστάσεων..." />
                  ) : theaterError ? (
                    <div className="mt-10 max-w-xl rounded-xl border border-amber-500/20 bg-amber-950/20 px-5 py-5 md:px-6 md:py-6">
                      <p className="text-sm leading-relaxed text-amber-100/85 font-body">Δεν ήταν δυνατή η φόρτωση.</p>
                    </div>
                  ) : (theaterShows ?? []).length === 0 ? (
                    <div className="mt-10 max-w-xl rounded-xl border border-white/10 bg-black/35 px-5 py-5 md:px-6 md:py-6">
                      <p className="text-sm leading-relaxed text-white/55 font-body">Δεν υπάρχουν παραστάσεις προς το παρόν.</p>
                    </div>
                  ) : (
                    <div className="mt-10 flex items-stretch gap-4 overflow-x-auto scrollbar-hide pb-2">
                      {(theaterShows ?? []).map((show, i) => (
                        <div
                          key={show.id}
                          className="flex h-full min-h-0 min-w-[170px] max-w-[170px] flex-shrink-0 md:min-w-[200px] md:max-w-[200px]"
                        >
                          <EventCard
                            slug={show.slug}
                            title={show.title}
                            subtitle={show.director}
                            genre={show.genre}
                            duration={show.duration}
                            gradientFrom={show.gradientFrom}
                            gradientTo={show.gradientTo}
                            posterUrl={show.posterUrl}
                            type="theater"
                            index={i}
                            badge={show.isPremiere ? "Πρεμιέρα" : show.isLastShows ? "Τελευταίες" : undefined}
                            className="w-full flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>,
            );
          case "new_movies":
            return sectionEl(
              "new_movies",
              <MovieRowScroll
                loading={moviesLoading}
                loadingMessage="Φόρτωση ταινιών..."
                fetchErrorMessage={moviesError ? "Δεν ήταν δυνατή η φόρτωση." : undefined}
                items={newMoviesList}
                muted
                eyebrow="Τελευταίες κυκλοφορίες"
                title="Νέες ταινίες"
                moviesMoreHref="/movies?section=new"
              />,
            );
          case "movies_week":
            return sectionEl(
              "movies_week",
              <MovieRowScroll
                loading={moviesLoading || showtimesLoading}
                loadingMessage="Φόρτωση προβολών εβδομάδας..."
                fetchErrorMessage={moviesError || showtimesError ? "Δεν ήταν δυνατή η φόρτωση." : undefined}
                items={weekMovies}
                muted
                eyebrow="Τρέχουσα εβδομάδα"
                title="Ταινίες της εβδομάδας"
                moviesMoreHref="/movies?section=week"
              />,
            );
          case "coming_soon":
            return sectionEl(
              "coming_soon",
              <MovieRowScroll
                loading={moviesLoading}
                loadingMessage="Φόρτωση ταινιών..."
                fetchErrorMessage={moviesError ? "Δεν ήταν δυνατή η φόρτωση." : undefined}
                items={comingSoonMovies}
                muted
                eyebrow="Μελλοντική κυκλοφορία"
                title="Προσεχώς"
                emptyMessage="Δεν υπάρχουν ταινίες με ημερομηνία κυκλοφορίας μετά τη σημερινή μέρα."
                moviesMoreHref="/movies?section=soon"
              />,
            );
          case "dining":
            return sectionEl(
              "dining",
              restaurantsLoading ? (
                <LoadingState message="Φόρτωση εστιατορίων..." />
              ) : restaurantsError ? (
                <div className="section-black border-y border-amber-500/20 bg-amber-950/15 py-10">
                  <div className="container max-w-7xl text-sm leading-relaxed text-amber-100/85 font-body">
                    Δεν ήταν δυνατή η φόρτωση.
                  </div>
                </div>
              ) : diningToShow.length === 0 ? (
                <div className="section-black border-y border-border/40 bg-muted/10 py-10">
                  <div className="container max-w-7xl text-sm text-muted-foreground font-body">Δεν υπάρχουν προτάσεις.</div>
                </div>
              ) : (
                <HorizontalScroll muted eyebrow="Περιεχόμενο" title="Φαγητό & μέρη στην πόλη">
                  {diningToShow.map((r, i) => (
                    <div
                      key={r.id}
                      className="min-w-[220px] max-w-[220px] md:min-w-[260px] md:max-w-[260px] flex-shrink-0"
                    >
                      <RestaurantCard restaurant={r} index={i} />
                    </div>
                  ))}
                </HorizontalScroll>
              ),
            );
          case "newsletter":
            return sectionEl(
              "newsletter",
              <div className="section-black py-10">
                <div className="container max-w-7xl text-center">
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                  >
                    <h3 className="font-display text-xl font-bold text-white mb-2">Μάθε τι παίζει κάθε εβδομάδα.</h3>
                    <p className="text-white/50 text-sm mb-5">Γράψου στο newsletter μας.</p>
                    <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
                      <input
                        type="email"
                        placeholder="Email"
                        className="flex-1 px-4 py-2.5 rounded bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/40"
                      />
                      <button
                        type="button"
                        className="px-5 py-2.5 bg-white text-[#111111] text-sm font-semibold rounded hover:bg-white/90 transition-colors"
                      >
                        Εγγραφή
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>,
            );
          default:
            return null;
        }
      })}

      <footer className="section-black py-12 border-t border-white/10">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-baseline gap-0.5">
                  <span
                    style={{
                      fontFamily: "Unbounded, sans-serif",
                      fontWeight: 300,
                      fontSize: "1.6rem",
                      color: "#F0EDF8",
                      letterSpacing: "-2px",
                      lineHeight: 1,
                    }}
                  >
                    37
                  </span>
                  <sup
                    style={{
                      fontFamily: '"Literata", Georgia, serif',
                      fontStyle: "italic",
                      fontWeight: 400,
                      fontSize: "0.8rem",
                      color: "rgba(240,237,248,0.6)",
                      verticalAlign: "super",
                    }}
                  >
                    °N
                  </sup>
                </div>
                <div
                  className="flex flex-col gap-0.5"
                  style={{ borderLeft: "1px solid rgba(240,237,248,0.15)", paddingLeft: "10px" }}
                >
                  <span
                    style={{
                      fontFamily: "Unbounded, sans-serif",
                      fontWeight: 700,
                      fontSize: "0.45rem",
                      color: "#F0EDF8",
                      letterSpacing: "2px",
                    }}
                  >
                    ATHENS GUIDE
                  </span>
                  <span
                    style={{
                      fontFamily: "DM Sans, sans-serif",
                      fontWeight: 300,
                      fontSize: "0.42rem",
                      color: "rgba(240,237,248,0.45)",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    Cinema · Events · Culture
                  </span>
                </div>
              </div>
              <p className="text-white/40 text-xs mt-2 leading-relaxed">Ο οδηγός σου για ψυχαγωγία και γαστρονομία στην Αθήνα.</p>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.15em] text-white/50 mb-3">Εξερεύνηση</h4>
              <div className="space-y-2 text-sm">
                <a href="/movies" className="block text-white/60 hover:text-white transition-colors">
                  Ταινίες
                </a>
                <a href="/theater" className="block text-white/60 hover:text-white transition-colors">
                  Θέατρο
                </a>
                <a href="/dining" className="block text-white/60 hover:text-white transition-colors">
                  Φαγητό
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.15em] text-white/50 mb-3">Περιεχόμενο</h4>
              <div className="space-y-2 text-sm">
                <a href="/venues" className="block text-white/60 hover:text-white transition-colors">
                  Χώροι
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.15em] text-white/50 mb-3">Social</h4>
              <div className="space-y-2 text-sm">
                <span className="block text-white/60">Instagram</span>
                <span className="block text-white/60">Facebook</span>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-center">
            <p className="text-xs text-white/30">© 2025 37°N Athens. Με ❤️ από την Αθήνα.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
