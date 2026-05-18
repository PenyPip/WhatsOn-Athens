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
import type { StrapiMovie, StrapiVenue } from "@/lib/api";
import {
  moviesMarkedNew,
  moviesWithShowtimeThisWeek,
  moviesWithSummerOutdoorShowtime,
} from "@/lib/homeMovieFilters";
import { ExternalLink, MapPin } from "lucide-react";

const summerStrip = [
  "Θερινό σινεμά",
  "Περιοδείες ανά την Ελλάδα",
  "Ανοιχτός ουρανός",
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
}) {
  if (loading) {
    return <LoadingState message={loadingMessage} />;
  }
  if (fetchErrorMessage) {
    return (
      <section className="relative section-black py-12 md:py-16 border-y border-white/[0.07]">
        <div className="container">
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
        <div className="container">
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
    <HorizontalScroll spotlight={spotlight} muted={muted} eyebrow={eyebrow} title={title} subtitle={subtitle}>
      {items.map((movie, i) => (
        <div key={movie.id} className="min-w-[170px] max-w-[170px] md:min-w-[200px] md:max-w-[200px] flex-shrink-0">
          <EventCard
            slug={movie.slug}
            title={movie.title}
            subtitle={movie.director}
            genre={movie.genre}
            duration={movie.duration}
            score={movie.criticScore}
            posterUrl={movie.posterUrl}
            type="movie"
            index={i}
          />
        </div>
      ))}
    </HorizontalScroll>
  );
}

function VenueSummerCard({ venue }: { venue: StrapiVenue }) {
  return (
    <div className="min-w-[260px] max-w-[260px] md:min-w-[280px] md:max-w-[280px] flex-shrink-0">
      <div className="card-elevated flex h-full flex-col p-5 text-left">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold leading-snug text-white">{venue.name}</h3>
          <span className="shrink-0 rounded bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#13143E]">
            θερινό
          </span>
        </div>
        <div className="grow space-y-2 text-sm text-white/55">
          {venue.address ? (
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-white/40" aria-hidden />
              <span>{venue.address}</span>
            </p>
          ) : null}
          {venue.city ? <p className="text-xs font-medium text-white/65">{venue.city}</p> : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {venue.moreLink ? (
            <a
              href={venue.moreLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:border-white/30 hover:bg-white/10"
            >
              Περισσότερα
              <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
            </a>
          ) : null}
          {venue.googleMapsUrl ? (
            <a
              href={venue.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-2 text-xs text-white/65 hover:border-white/30 hover:text-white"
            >
              Χάρτης
              <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

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

  const summerMovies = useMemo(
    () => moviesWithSummerOutdoorShowtime(movieList, stList, venueList),
    [movieList, stList, venueList],
  );
  const summerVenueList = useMemo(
    () =>
      [...venueList]
        .filter((v) => v.summerOutdoor)
        .sort((a, b) => a.name.localeCompare(b.name, "el")),
    [venueList],
  );
  const weekMovies = useMemo(() => moviesWithShowtimeThisWeek(movieList, stList), [movieList, stList]);
  const newMoviesList = useMemo(() => moviesMarkedNew(movieList), [movieList]);

  const sectionEl = (id: HomeSectionId, node: ReactNode) => <Fragment key={id}>{node}</Fragment>;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {apiSectionFailed ? (
        <div className="section-black border-b border-amber-500/30 bg-amber-950/25 px-4 py-3 md:py-4">
          <div className="container text-center text-sm text-amber-100/90 font-body md:text-left md:text-[0.9375rem]">
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
                <div className="container flex items-center gap-8 overflow-x-auto scrollbar-hide text-xs font-body uppercase tracking-[0.15em]">
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
          case "summer_cinema":
            return sectionEl(
              "summer_cinema",
              <MovieRowScroll
                loading={moviesLoading || showtimesLoading || venuesLoading}
                loadingMessage="Φόρτωση θερινών προβολών..."
                fetchErrorMessage={
                  moviesError || showtimesError ? "Δεν ήταν δυνατή η φόρτωση." : undefined
                }
                items={summerMovies}
                spotlight
                eyebrow="Καλοκαίρι · ανοιχτός ουρανός"
                title="Θερινά σινεμά"
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
                    <div className="container">
                      <div className="max-w-xl rounded-xl border border-amber-500/25 bg-amber-950/20 px-5 py-5 md:px-6 md:py-6">
                        <p className="font-display text-lg tracking-tight text-amber-100">Τα θερινά σινεμά</p>
                        <p className="mt-3 text-sm leading-relaxed text-amber-100/80 font-body">
                          Δεν ήταν δυνατή η φόρτωση των χώρων.
                        </p>
                      </div>
                    </div>
                  </section>
                ) : summerVenueList.length === 0 ? (
                  <section className="relative section-black border-y border-white/[0.07] py-12 md:py-16">
                    <div className="container">
                      <div className="max-w-xl rounded-xl border border-white/10 bg-black/35 px-5 py-5 md:px-6 md:py-6">
                        <p className="font-display text-lg tracking-tight text-white">Τα θερινά σινεμά</p>
                        <p className="mt-3 text-sm leading-relaxed text-white/55 font-body">
                          Κανένας χώρος δεν έχει δηλωθεί ως θερινός στο CMS. Σήμανσε «Θερινό (ανοιχτό σινεμά)» στο κατάλληλο μέρο για να εμφανιστεί εδώ.
                        </p>
                      </div>
                    </div>
                  </section>
                ) : (
                  <>
                    <HorizontalScroll
                      spotlight
                      eyebrow="Χώροι"
                      title="Τα θερινά σινεμά"
                      subtitle="Σινεμά που έχουν τσεκάρει «Θερινό (ανοιχτό σινεμά)» στο Strapi"
                    >
                      {summerVenueList.map((venue) => (
                        <VenueSummerCard key={venue.id} venue={venue} />
                      ))}
                    </HorizontalScroll>
                    <div className="section-black pb-10 pt-0">
                      <div className="container text-center">
                        <a href="/venues" className="text-sm font-medium text-amber-200/90 hover:text-amber-100">
                          Δες όλους τους χώρους →
                        </a>
                      </div>
                    </div>
                  </>
                )}
              </>,
            );
          case "tours":
            return sectionEl(
              "tours",
              <div className="section-black relative overflow-hidden py-14 md:py-20">
                <div aria-hidden className="pointer-events-none absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-amber-500/10 blur-[90px]" />
                <div className="container relative z-[1]">
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
                    <div className="mt-10 flex items-start gap-4 overflow-x-auto scrollbar-hide pb-2">
                      {(theaterShows ?? []).map((show, i) => (
                        <div
                          key={show.id}
                          className="min-w-[170px] max-w-[170px] md:min-w-[200px] md:max-w-[200px] flex-shrink-0"
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
                eyebrow="Προβολές"
                title="Νέες ταινίες"
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
              />,
            );
          case "dining":
            return sectionEl(
              "dining",
              restaurantsLoading ? (
                <LoadingState message="Φόρτωση εστιατορίων..." />
              ) : restaurantsError ? (
                <div className="section-black border-y border-amber-500/20 bg-amber-950/15 py-10">
                  <div className="container max-w-xl text-sm leading-relaxed text-amber-100/85 font-body">
                    Δεν ήταν δυνατή η φόρτωση.
                  </div>
                </div>
              ) : diningToShow.length === 0 ? (
                <div className="section-black border-y border-border/40 bg-muted/10 py-10">
                  <div className="container max-w-xl text-sm text-muted-foreground font-body">Δεν υπάρχουν προτάσεις.</div>
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
                <div className="container text-center">
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
                      fontFamily: "Cormorant Garamond, serif",
                      fontStyle: "italic",
                      fontWeight: 300,
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
