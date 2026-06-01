import { Link } from "react-router-dom";
import HorizontalScroll from "@/components/HorizontalScroll";
import EventCard from "@/components/EventCard";
import RestaurantCard from "@/components/RestaurantCard";
import VenueCard from "@/components/VenueCard";
import type { ReactNode } from "react";
import { Fragment, useMemo } from "react";
import { useDeferUntilLcpDone } from "@/hooks/useDeferUntilLcpDone";
import { useMovies, useShowtimes, useRestaurants, useVenues, useTheaterShows } from "@/hooks/useStrapi";
import {
  homeNeedsDining,
  homeNeedsShowtimes,
  homeNeedsTheater,
  homeNeedsVenues,
  type HomeSectionId,
  type ResolvedHomepageLayout,
} from "@/config/home";
import type { StrapiMovie } from "@/lib/api";
import { movieTitleLines } from "@/lib/movieTitles";
import {
  moviesReleasedInLastDays,
  moviesComingAfterUpcomingCinemaWeek,
  moviesForUpcomingCinemaWeek,
  moviesWithSummerOutdoorShowtimeThisCinemaWeek,
  moviesWithShowtimeToday,
  summerVenuesWithShowtimesOrAll,
  moviesFromUpcomingShowtimes,
  enrichMoviesWithShowtimeGenre,
  formatUpcomingCinemaWeekRange,
} from "@/lib/homeMovieFilters";
import { resolveImdbRating } from "@/lib/movieImdb";
import MostTalkedAboutHero from "@/components/MostTalkedAboutHero";
import { mostTalkedAboutMovies } from "@/lib/homeHeroPick";
import { moviesSectionPath } from "@/lib/moviesFilterPaths";
import { moviesVenueProgramPath } from "@/lib/moviesVenuePath";
import { theaterGenreLabel } from "@/lib/theaterGenre";
import { filterTouringShowsForHome } from "@/lib/theaterTours";
import { siteSeo } from "@/lib/siteMetadata";

const MOVIE_ROW_MIN_H = "min-h-[20rem] md:min-h-[22rem]";
const MOVIE_ROW_SPOTLIGHT_MIN_H = "min-h-[26rem] md:min-h-[28rem]";
const MOVIE_ROW_GRID_MIN_H = "min-h-[14rem] md:min-h-[16rem]";

function movieRowShell(layout: "scroll" | "grid", spotlight: boolean | undefined, children: ReactNode) {
  const minH =
    layout === "grid" ? MOVIE_ROW_GRID_MIN_H : spotlight ? MOVIE_ROW_SPOTLIGHT_MIN_H : MOVIE_ROW_MIN_H;
  return <div className={minH}>{children}</div>;
}

const summerStrip = [
  "Θερινό σινεμά",
  "Περιοδείες ανά την Ελλάδα",
  "Θέατρο καλοκαιριού",
  "Ξανά στη σκηνή",
];

function HomeMovieCardsSkeleton({ layout = "scroll" }: { layout?: "scroll" | "grid" }) {
  const cards = Array.from({ length: layout === "grid" ? 5 : 4 }, (_, i) => i);
  if (layout === "grid") {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {cards.map((i) => (
          <div key={i} className="overflow-hidden rounded-lg bg-muted/30 ring-1 ring-border/[0.1]">
            <div className="aspect-[2/3] w-full animate-pulse bg-[#1C1D62]/10" />
            <div className="space-y-2 px-2 py-3">
              <div className="h-3 w-full animate-pulse rounded bg-[#1C1D62]/10" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-[#1C1D62]/8" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex gap-4 overflow-hidden pb-2">
      {cards.map((i) => (
        <div
          key={i}
          className="h-[18rem] w-[11rem] shrink-0 animate-pulse rounded-lg bg-[#1C1D62]/10 md:h-[20rem] md:w-[13rem]"
        />
      ))}
    </div>
  );
}

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
  moviesMoreHref,
  layout = "scroll",
  summerScreeningOnPoster = false,
}: {
  loading: boolean;
  loadingMessage: string;
  items: StrapiMovie[];
  emptyMessage?: string;
  fetchErrorMessage?: string;
  spotlight?: boolean;
  muted?: boolean;
  eyebrow: string;
  title: string;
  subtitle?: string;
  moviesMoreHref?: string;
  layout?: "scroll" | "grid";
  /** Ετικέτα «Θερινό» πάνω δεξιά στην αφίσα (ενότητα θερινών προβολών). */
  summerScreeningOnPoster?: boolean;
}) {
  if (loading) {
    return movieRowShell(
      layout,
      spotlight,
      <>
        <section
          className={
            muted
              ? "relative border-y border-border/40 bg-muted/20 py-8 md:py-10"
              : "section-black relative border-y border-white/[0.07] py-12 md:py-16"
          }
        >
          <div className="container max-w-7xl">
            <span
              className={
                muted
                  ? "mb-2 block font-body text-[10px] uppercase tracking-[0.22em] text-muted-foreground opacity-75"
                  : "mb-2 block font-body text-[10px] uppercase tracking-[0.22em] text-amber-200/85"
              }
            >
              {eyebrow}
            </span>
            <h2
              className={
                muted
                  ? "font-display text-xl font-bold text-foreground md:text-2xl"
                  : "font-display text-2xl font-bold text-white md:text-3xl"
              }
            >
              {title}
            </h2>
            <div className="mt-6">
              <HomeMovieCardsSkeleton layout={layout} />
            </div>
          </div>
        </section>
        <span className="sr-only" role="status" aria-live="polite">
          {loadingMessage}
        </span>
      </>,
    );
  }
  if (fetchErrorMessage) {
    return (
      <section className="relative section-black border-y border-white/[0.07] py-12 md:py-16">
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
      <section className="relative section-black border-y border-white/[0.07] py-12 md:py-16">
        <div className="container max-w-7xl">
          <div className="max-w-xl rounded-xl border border-white/10 bg-black/35 px-5 py-5 md:px-6 md:py-6">
            <p className="font-display text-lg tracking-tight text-white">{title}</p>
            {emptyMessage ? (
              <p className="mt-3 text-sm leading-relaxed text-white/70 font-body">{emptyMessage}</p>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (layout === "grid") {
    return movieRowShell(layout, spotlight, (
      <>
        <section className="relative border-y border-border/40 bg-muted/20 py-8 md:py-10">
          <div className="container max-w-7xl">
            <span className="mb-2 block font-body text-[10px] uppercase tracking-[0.22em] text-muted-foreground opacity-75">
              {eyebrow}
            </span>
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">{title}</h2>
            {subtitle ? (
              <p className="mt-1 max-w-xl font-body text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            ) : null}
            <ul
              className="mt-6 grid list-none grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              aria-label={title}
            >
              {items.map((movie, i) => {
                const tl = movieTitleLines(movie);
                return (
                  <li key={`${movie.id}-${movie.slug}`}>
                    <div className="h-full">
                      <EventCard
                        slug={movie.slug}
                        title={tl.primary}
                        titleSecondary={tl.secondary}
                        subtitle=""
                        genre=""
                        duration={movie.duration}
                        imdbRating={resolveImdbRating(movie)}
                        posterUrl={movie.posterUrl}
                        posterSrcSet={movie.posterSrcSet}
                        type="movie"
                        isDubbed={movie.isDubbed}
                        summerScreening={summerScreeningOnPoster}
                        uniformMovieSizing
                        compactMovieMeta
                        index={i}
                        className="h-full w-full"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
        {moviesMoreHref ? (
          <div className="relative border-b border-border/40 bg-muted/[0.12] pb-12 pt-4 text-center">
            <div className="container max-w-7xl">
              <Link
                to={moviesMoreHref}
                className="inline-flex text-sm font-semibold text-[#13143E] underline underline-offset-4 hover:text-[#13143E]/85 dark:text-white/85 dark:hover:text-white"
              >
                Δες περισσότερα
              </Link>
            </div>
          </div>
        ) : null}
      </>
    ));
  }

  return movieRowShell(layout, spotlight, (
    <>
      <HorizontalScroll spotlight={spotlight} muted={muted} eyebrow={eyebrow} title={title} subtitle={subtitle}>
        {items.map((movie, i) => {
          const tl = movieTitleLines(movie);
          return (
            <div
              key={`${movie.id}-${movie.slug}`}
              className="flex h-full min-h-0 w-[170px] max-w-[170px] flex-shrink-0 self-stretch md:w-[200px] md:max-w-[200px]"
            >
              <EventCard
                slug={movie.slug}
                title={tl.primary}
                titleSecondary={tl.secondary}
                subtitle=""
                genre=""
                duration={movie.duration}
                imdbRating={resolveImdbRating(movie)}
                posterUrl={movie.posterUrl}
                posterSrcSet={movie.posterSrcSet}
                type="movie"
                isDubbed={movie.isDubbed}
                summerScreening={summerScreeningOnPoster}
                uniformMovieSizing
                compactMovieMeta
                index={i}
                className="h-full w-full min-h-0 flex-1"
              />
            </div>
          );
        })}
      </HorizontalScroll>
      {moviesMoreHref && items.length > 0 ? (
        <div
          className={
            muted
              ? "relative border-b border-border/40 bg-muted/[0.12] pb-12 pt-4 text-center"
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
  ));
}

type HomeBodyProps = {
  layout: ResolvedHomepageLayout;
};

export default function HomeBody({ layout }: HomeBodyProps) {
  const sections = layout.sections;
  const needsVenues = homeNeedsVenues(sections);
  const needsTheater = homeNeedsTheater(sections);
  const needsDining = homeNeedsDining(sections);
  const needsShowtimes = homeNeedsShowtimes(sections);
  const deferSecondary = useDeferUntilLcpDone();

  const { data: movies, isPending: moviesPending, isError: moviesError } = useMovies();
  const { data: showtimes, isPending: showtimesPending, isError: showtimesError } = useShowtimes(needsShowtimes);
  const awaitingMovies = movies === undefined && moviesPending;
  const awaitingShowtimes = showtimes === undefined && showtimesPending;
  const { data: venues, isLoading: venuesLoading, isError: venuesError } = useVenues(needsVenues && deferSecondary);
  const { data: restaurants, isLoading: restaurantsLoading, isError: restaurantsError } = useRestaurants(
    needsDining && deferSecondary,
  );
  const {
    data: theaterShows,
    isPending: theaterPending,
    isFetching: theaterFetching,
    isError: theaterError,
    isFetched: theaterFetched,
  } = useTheaterShows(needsTheater);
  const theaterAwaiting = needsTheater && !theaterFetched && (theaterPending || theaterFetching);
  const theaterLoadFailed = needsTheater && theaterFetched && theaterError && theaterShows === undefined;
  const apiSectionFailed = moviesError || showtimesError || venuesError || restaurantsError;

  const stList = useMemo(() => showtimes ?? [], [showtimes]);
  const movieList = useMemo(() => {
    const cat = movies ?? [];
    if (cat.length) return enrichMoviesWithShowtimeGenre(cat, stList);
    if (stList.length) return moviesFromUpcomingShowtimes([], stList);
    return [];
  }, [movies, stList]);
  const venueList = useMemo(() => venues ?? [], [venues]);
  const diningToShow = useMemo(() => {
    const all = restaurants ?? [];
    const flagged = all.filter((r) => r.isNew);
    return flagged.length > 0 ? flagged : all.slice(0, 12);
  }, [restaurants]);
  const summerVenuesForHome = useMemo(
    () => summerVenuesWithShowtimesOrAll(venueList, stList),
    [venueList, stList],
  );
  const touringShowsForHome = useMemo(
    () => filterTouringShowsForHome(theaterShows ?? []),
    [theaterShows],
  );
  const summerMoviesForHome = useMemo(
    () => moviesWithSummerOutdoorShowtimeThisCinemaWeek(movieList, stList, venueList),
    [movieList, stList, venueList],
  );
  const weekMovies = useMemo(() => moviesForUpcomingCinemaWeek(movieList, stList), [movieList, stList]);
  const upcomingWeekLabel = useMemo(() => formatUpcomingCinemaWeekRange(), []);
  const todayMovies = useMemo(() => moviesWithShowtimeToday(movieList, stList), [movieList, stList]);
  const newMoviesList = useMemo(
    () => moviesReleasedInLastDays(movieList, 10, stList, venueList),
    [movieList, stList, venueList],
  );
  const comingSoonMovies = useMemo(
    () => moviesComingAfterUpcomingCinemaWeek(movieList, stList, venueList),
    [movieList, stList, venueList],
  );
  const mostTalkedAboutList = useMemo(() => mostTalkedAboutMovies(movieList), [movieList]);

  const sectionEl = (id: HomeSectionId, node: ReactNode) => <Fragment key={id}>{node}</Fragment>;

  return (
    <>
      {apiSectionFailed ? (
        <div className="section-black border-b border-amber-500/30 bg-amber-950/25 px-4 py-3 md:py-4">
          <div className="container max-w-7xl text-center text-sm text-amber-100/90 font-body md:text-left md:text-[0.9375rem]">
            Μερικά δεδομένα δεν φορτώθηκαν. Δοκίμασε να ανανεώσεις τη σελίδα.
          </div>
        </div>
      ) : null}
      {sections.map((id) => {
        switch (id) {
          case "hero":
            return sectionEl(
              "hero",
              <MostTalkedAboutHero
                movies={mostTalkedAboutList}
                showtimes={stList}
                loading={awaitingMovies}
              />,
            );
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
                loading={awaitingShowtimes}
                loadingMessage="Φόρτωση προβολών της ημέρας..."
                fetchErrorMessage={
                  moviesError || showtimesError ? "Δεν ήταν δυνατή η φόρτωση." : undefined
                }
                items={todayMovies}
                muted
                eyebrow="Σήμερα"
                title="Ταινίες σήμερα"
                moviesMoreHref={moviesSectionPath("today")}
              />,
            );
          case "summer_cinema":
            return sectionEl(
              "summer_cinema",
              <MovieRowScroll
                loading={awaitingShowtimes}
                loadingMessage="Φόρτωση θερινών προβολών..."
                fetchErrorMessage={
                  moviesError || showtimesError || venuesError ? "Δεν ήταν δυνατή η φόρτωση." : undefined
                }
                items={summerMoviesForHome}
                spotlight
                eyebrow="Καλοκαίρι · θερινές προβολές"
                title="Θερινά σινεμά"
                subtitle="Παίζουν τώρα"
                moviesMoreHref={moviesSectionPath("summer")}
                summerScreeningOnPoster
              />,
            );
          case "summer_venues":
            return sectionEl(
              "summer_venues",
              <>
                {venues === undefined && venuesLoading ? (
                  <section className="relative section-black border-y border-white/[0.07] py-10 md:py-14">
                    <div className="container max-w-7xl">
                      <div className="mb-8 h-8 w-48 animate-pulse rounded bg-white/10" />
                      <ul className="grid list-none grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                        {[0, 1, 2].map((i) => (
                          <li key={i} className="h-28 animate-pulse rounded-xl bg-white/10" />
                        ))}
                      </ul>
                    </div>
                  </section>
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
                        <p className="mt-3 text-sm leading-relaxed text-white/70 font-body">
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
                      <div>
                        <span className="mb-2 block font-body text-[10px] uppercase tracking-[0.22em] text-amber-300/95">
                          Χώροι
                        </span>
                        <h2 className="font-display text-3xl font-bold leading-tight text-white md:text-4xl md:leading-[1.12]">
                          Τα θερινά σινεμά
                        </h2>
                      </div>
                      <ul
                        className="mt-8 grid list-none grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3"
                        aria-label="Λίστα θερινών σινεμά"
                      >
                        {summerVenuesForHome.map((venue) => (
                          <li key={venue.id}>
                            <div className="h-full">
                              <VenueCard
                                venue={venue}
                                variant="spotlight"
                                layout="grid"
                                compact
                                moviesHref={moviesVenueProgramPath(venue.slug)}
                              />
                            </div>
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
                  <div>
                    <span className="mb-2 block font-body text-[10px] uppercase tracking-[0.24em] text-amber-200/85">
                      Καλοκαιρινές περιοδείες
                    </span>
                    <h2 className="font-display text-3xl font-bold leading-tight text-white md:text-5xl md:leading-[1.1]">
                      Περιοδείες & παραστάσεις που ταξιδεύουν
                    </h2>
                  </div>
                  {theaterAwaiting ? (
                    <div className="mt-10 flex gap-4 overflow-hidden pb-2">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-[11.5rem] w-[17rem] shrink-0 animate-pulse rounded-lg bg-white/10 md:h-[12.5rem] md:w-[19rem]"
                        />
                      ))}
                    </div>
                  ) : theaterLoadFailed ? (
                    <div className="mt-10 max-w-xl rounded-xl border border-amber-500/20 bg-amber-950/20 px-5 py-5 md:px-6 md:py-6">
                      <p className="text-sm leading-relaxed text-amber-100/85 font-body">Δεν ήταν δυνατή η φόρτωση.</p>
                    </div>
                  ) : touringShowsForHome.length === 0 ? (
                    <div className="mt-10 max-w-2xl rounded-xl border border-white/10 bg-black/35 px-5 py-6 md:px-7 md:py-7">
                      <p className="font-body text-sm leading-relaxed text-white/75 md:text-[0.9375rem]">
                        Δεν υπάρχουν περιοδείες προς το παρόν. Στο CMS δημιούργησε{" "}
                        <strong className="font-medium text-white">Theater Show</strong> με ενεργό{" "}
                        <strong className="font-medium text-white">on tour</strong>, προαιρετικά χωρίς χώρο (venue), και
                        βάλε το <strong className="font-medium text-white">more link</strong> στην παράσταση (όχι στον
                        χώρο).
                      </p>
                      <a
                        href="/theater"
                        className="mt-5 inline-flex text-sm font-semibold text-amber-200/95 transition-colors hover:text-amber-50"
                      >
                        Όλες οι παραστάσεις
                        <span aria-hidden className="ml-1 opacity-75">
                          →
                        </span>
                      </a>
                    </div>
                  ) : (
                    <>
                      <ul
                        className="mt-10 flex list-none items-stretch gap-4 overflow-x-auto scrollbar-hide pb-2"
                        aria-label="Περιοδείες θεάτρου"
                      >
                        {touringShowsForHome.map((show, i) => (
                          <li key={show.id} className="flex h-full min-h-0 shrink-0">
                            <EventCard
                              slug={show.slug}
                              title={show.title}
                              subtitle={show.director ?? ""}
                              genre={theaterGenreLabel(show.genre)}
                              duration={show.duration ?? 0}
                              posterUrl={show.posterUrl}
                              type="theater"
                              badge="Περιοδεία"
                              compactMovieMeta
                              darkSectionCard
                              className="w-[17rem] md:w-[19rem]"
                              index={i}
                            />
                          </li>
                        ))}
                      </ul>
                      <div className="mt-10 border-t border-white/10 pt-8 text-center">
                        <a
                          href="/theater"
                          className="inline-flex items-center gap-1 text-sm font-semibold text-amber-200/95 transition-colors hover:text-amber-50"
                        >
                          Όλες οι παραστάσεις
                          <span aria-hidden className="opacity-75">
                            →
                          </span>
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </div>,
            );
          case "new_movies":
            return sectionEl(
              "new_movies",
              <MovieRowScroll
                loading={awaitingMovies}
                loadingMessage="Φόρτωση ταινιών..."
                fetchErrorMessage={moviesError ? "Δεν ήταν δυνατή η φόρτωση." : undefined}
                items={newMoviesList}
                muted
                eyebrow="Τελευταίες κυκλοφορίες"
                title="Νέες ταινίες"
                moviesMoreHref={moviesSectionPath("new")}
              />,
            );
          case "movies_week":
            return sectionEl(
              "movies_week",
              <MovieRowScroll
                loading={awaitingShowtimes}
                loadingMessage="Φόρτωση ταινιών εβδομάδας..."
                fetchErrorMessage={moviesError || showtimesError ? "Δεν ήταν δυνατή η φόρτωση." : undefined}
                items={weekMovies}
                muted
                eyebrow="Εβδομάδα κινηματογράφου"
                title="Ταινίες της ερχόμενης εβδομάδας"
                subtitle={upcomingWeekLabel}
                layout="grid"
                moviesMoreHref={moviesSectionPath("week")}
              />,
            );
          case "coming_soon":
            return sectionEl(
              "coming_soon",
              <MovieRowScroll
                loading={awaitingMovies}
                loadingMessage="Φόρτωση ταινιών..."
                fetchErrorMessage={moviesError ? "Δεν ήταν δυνατή η φόρτωση." : undefined}
                items={comingSoonMovies}
                muted
                eyebrow="Μελλοντική κυκλοφορία"
                title="Προσεχώς"
                emptyMessage="Δεν υπάρχουν ταινίες με κυκλοφορία μετά την επόμενη εβδομάδα κινηματογράφου."
                moviesMoreHref={moviesSectionPath("soon")}
              />,
            );
          case "dining":
            return sectionEl(
              "dining",
              restaurants === undefined && restaurantsLoading ? (
                <div className="section-black border-y border-white/[0.07] py-10">
                  <div className="container max-w-7xl">
                    <div className="mb-6 h-7 w-40 animate-pulse rounded bg-white/10" />
                    <div className="flex gap-4 overflow-hidden">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="h-52 w-[220px] shrink-0 animate-pulse rounded-lg bg-white/10 md:w-[260px]" />
                      ))}
                    </div>
                  </div>
                </div>
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
                  <div>
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
                  </div>
                </div>
              </div>,
            );
          default:
            return null;
        }
      })}
    </>
  );
}
