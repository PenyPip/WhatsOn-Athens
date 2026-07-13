import { useParams, Link, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import PosterPicture from "@/components/PosterPicture";
import MoviePosterMeta from "@/components/MoviePosterMeta";
import { Clock, Globe, ArrowLeft, MapPin, Play } from "lucide-react";
import SharePageButton from "@/components/SharePageButton";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import { Button } from "@/components/ui/button";
import {
  useMovies,
  useTheaterShows,
  useEditorialReviews,
  useUserReviews,
  useShowtimes,
  useTheaterPerformances,
  useMovieBySlug,
  useMovieGenreCatalog,
  useMovieGenres,
  useVenues,
  useArticlesForMovie,
  useArticlesForTheater,
} from "@/hooks/useStrapi";
import RelatedArticlesSection from "@/components/RelatedArticlesSection";
import EventCard from "@/components/EventCard";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import {
  normalizeCastFromStrapi,
  resolveMovieGenreLine,
  type StrapiMovie,
  type StrapiShowtime,
  type StrapiTheaterPerformance,
  type StrapiTheaterShow,
  type StrapiVenue,
} from "@/lib/api";
import { ShowtimePriceLabels } from "@/components/ShowtimePriceLabels";
import { VenueDayPricesTable } from "@/components/VenueDayPricesTable";
import { resolvePricingForShowtime } from "@/lib/venuePricing";
import { movieTitleLines, posterAltForMovie, posterAltForTheater } from "@/lib/movieTitles";
import {
  showtimeIsUpcoming,
  showtimeShowsOutdoorLabel,
  enrichMoviesWithShowtimeGenre,
  mergeMovieWithShowtimeFields,
} from "@/lib/homeMovieFilters";
import { sortMoviesByCinemaCount } from "@/lib/movieCinemaSort";
import { sortVenueShowingsBlocks } from "@/lib/favoriteSort";
import { useFavoriteIds } from "@/hooks/useFavoriteIds";
import {
  formatShowtimeWeekRangeLabel,
  showtimeIsWeekBlock,
  showtimeIsUpcoming as scheduleSlotIsUpcoming,
} from "@/lib/showtimeSchedule";
import SummerScreeningIndicator from "@/components/SummerScreeningIndicator";
import FavoriteButton from "@/components/FavoriteButton";
import SeenButton from "@/components/SeenButton";
import RateReminderBanner from "@/components/RateReminderBanner";
import PopularBadge from "@/components/PopularBadge";
import WriteReviewForm from "@/components/WriteReviewForm";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyReviews } from "@/lib/userProfile";
import { userHasReviewedContent } from "@/lib/seenContent";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMoviePopularity } from "@/hooks/usePopularity";
import { cn } from "@/lib/utils";
import MovieDetailIntro from "@/components/MovieDetailIntro";
import { usePageSeo } from "@/hooks/usePageSeo";
import { movieDetailSeo, staticPageSeo, theaterPageDescription } from "@/lib/pageSeoCopy";
import {
  buildMovieShowtimeShareUrl,
  parseMovieShowtimeDeepLink,
} from "@/lib/movieShowtimeShare";
import ImdbRatingBadge from "@/components/ImdbRatingBadge";
import { resolveImdbRating } from "@/lib/movieImdb";
import { buildMovieDetailJsonLd } from "@/lib/jsonLdMovieDetail";
import { buildTheaterDetailJsonLd } from "@/lib/jsonLdTheaterDetail";
import JsonLd from "@/components/JsonLd";
import {
  PAGE_BELOW_NAV_CLASS,
  PAGE_DETAIL_HERO_INNER_CLASS,
  PAGE_MOVIE_DETAIL_HERO_INNER_CLASS,
} from "@/components/PageListHeader";
import GenreLinks from "@/components/GenreLinks";
import CinemaVenueLinks from "@/components/CinemaVenueLinks";
import VenueBookingLink from "@/components/VenueBookingLink";
import TheaterShowMoreLink from "@/components/TheaterShowMoreLink";
import { theaterGenreLabel } from "@/lib/theaterGenre";
import { formatTheaterRunPeriod } from "@/lib/theaterRunDates";
import { isTouringTheaterShow } from "@/lib/theaterTours";
import ShowtimesExpandable from "@/components/ShowtimesExpandable";
import { movieGenreLinkItems } from "@/lib/movieGenreLinks";
import { TheaterTicketHeroPreview } from "@/components/TheaterTicketPrices";
import ScheduleCompactRow from "@/components/ScheduleCompactRow";
import { groupTheaterPerformancesByVenue } from "@/lib/theaterPerformances";
import { resolveTheaterTicketPrices, theaterPriceLabel } from "@/lib/theaterPricing";
import {
  cinemaGroupKey,
  isValidExternalUrl,
  moviesHrefForShowtimes,
  resolveCinemaGroupFromShowtimes,
  venueProgramHref,
} from "@/lib/venueResolve";
import MovieDetailShowtimeFilters from "@/components/MovieDetailShowtimeFilters";
import {
  filterMovieDetailShowtimes,
  movieDetailShowtimeFilterOptions,
  type MovieDetailDayFilter,
} from "@/lib/movieDetailShowtimeFilters";
import type { AthensDistrictKey, VenueAreaKey } from "@/lib/venueArea";

/** Γραμμή προβολής (ημερομηνία, ώρα, αίθουσα κ.λπ.) · χρησιμοποιείται και στη λίστα όλων των προβολών στη σελίδα ταινίας. */
function ShowtimeCompactRow({
  st,
  venue,
  emphasized = false,
  highlighted = false,
}: {
  st: StrapiShowtime;
  venue?: StrapiVenue | null;
  emphasized?: boolean;
  highlighted?: boolean;
}) {
  if (showtimeIsWeekBlock(st)) {
    const weekLabel = formatShowtimeWeekRangeLabel(st);
    return (
      <li
        id={st.id ? `st-${st.id}` : undefined}
        className={cn(
          "flex flex-col gap-0.5 border-b border-border/80 last:border-0",
          emphasized ? "py-3 text-sm sm:py-3.5" : "py-3.5 text-sm",
          highlighted && "rounded-md bg-amber-50/90 ring-1 ring-amber-400/40 px-2 -mx-2",
        )}
      >
        <p className="font-medium text-foreground">
          {weekLabel ?? "Εβδομάδα προβολών"}
          <span className="text-muted-foreground"> · ώρες σύντομα</span>
        </p>
        {st.hallName ? <p className="text-muted-foreground">Αίθουσα · {st.hallName}</p> : null}
      </li>
    );
  }

  const d = new Date(st.datetime);
  const pricing = resolvePricingForShowtime(st, venue);
  const showSummer = showtimeShowsOutdoorLabel(st);

  return (
    <li
      id={st.id ? `st-${st.id}` : undefined}
      className={cn(
        "flex flex-col gap-0.5 border-b border-border/80 last:border-0",
        emphasized ? "py-3 text-sm sm:py-3.5" : "py-3.5 text-sm",
        highlighted && "rounded-md bg-amber-50/90 ring-1 ring-amber-400/40 px-2 -mx-2",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span
            className={cn(
              "capitalize text-foreground",
              emphasized ? "text-sm text-muted-foreground" : "font-medium",
            )}
          >
            {d.toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 font-semibold tabular-nums text-[#13143E]",
              emphasized ? "text-base" : "text-lg",
            )}
          >
            {d.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit", hour12: false })}
            {showSummer ? <SummerScreeningIndicator className="text-amber-600" iconClassName="h-3.5 w-3.5" /> : null}
          </span>
        </div>
        <ShowtimePriceLabels regular={pricing.regular} student={pricing.student} />
      </div>
      {st.hallName ? (
        <p className="text-muted-foreground">Αίθουσα · {st.hallName}</p>
      ) : null}
    </li>
  );
}

/** YouTube watch / youtu.be / embed → URL για iframe. */
function youtubeEmbedUrl(raw: string | undefined): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.hostname === "youtu.be" || u.hostname.endsWith(".youtu.be")) {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtube-nocookie.com")) {
      const fromQuery = u.searchParams.get("v");
      if (fromQuery) return `https://www.youtube.com/embed/${fromQuery}`;
      const fromPath = u.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/);
      if (fromPath?.[1]) return `https://www.youtube.com/embed/${fromPath[1]}`;
    }
  } catch {
    return null;
  }
  return null;
}

function reviewContentMatchesMovie(contentTitle: string, movie: StrapiMovie): boolean {
  const ct = contentTitle.trim();
  if (!ct) return false;
  const tl = movieTitleLines(movie);
  const variants = new Set(
    [movie.title, movie.originalTitle, tl.primary, tl.secondary]
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean),
  );
  return variants.has(ct);
}

const EventDetail = ({ type }: { type: "movie" | "theater" }) => {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const deepLink = useMemo(
    () => parseMovieShowtimeDeepLink(searchParams.toString()),
    [searchParams],
  );
  const isMovieRoute = type === "movie";
  const isTheaterRoute = type === "theater";
  const [loadRelatedMovies, setLoadRelatedMovies] = useState(false);

  useEffect(() => {
    if (!isMovieRoute) return;
    const run = () => setLoadRelatedMovies(true);
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(run, { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(run, 400);
    return () => window.clearTimeout(t);
  }, [isMovieRoute]);

  const { data: movies, isLoading: moviesLoading } = useMovies(isMovieRoute && loadRelatedMovies);
  const { data: theaterShows, isLoading: theaterLoading } = useTheaterShows(isTheaterRoute);
  const { data: editorialReviews } = useEditorialReviews();
  const { data: userReviews } = useUserReviews();
  const { isAuthenticated, profile } = useAuth();
  const { data: myReviews } = useQuery({
    queryKey: ["myReviews"],
    queryFn: fetchMyReviews,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  const favoriteIds = useFavoriteIds();
  const { data: showtimes, isLoading: showtimesLoading } = useShowtimes(isMovieRoute);
  const { data: theaterPerformances, isLoading: performancesLoading } = useTheaterPerformances(isTheaterRoute);
  const { data: genreCatalog } = useMovieGenreCatalog(isMovieRoute && loadRelatedMovies);
  const { data: movieGenresList } = useMovieGenres(isMovieRoute);
  const { data: venues } = useVenues(isMovieRoute || isTheaterRoute);

  const moviesEnriched = useMemo(
    () => enrichMoviesWithShowtimeGenre(movies ?? [], showtimes ?? []),
    [movies, showtimes],
  );

  const movieFromList = useMemo(
    () => (type === "movie" && slug ? moviesEnriched?.find((m) => m.slug === slug) : undefined),
    [type, moviesEnriched, slug],
  );

  const { data: movieBySlug, isLoading: movieBySlugLoading } = useMovieBySlug(isMovieRoute && slug ? slug : "");
  const { data: articlesForMovie } = useArticlesForMovie(slug ?? "", isMovieRoute && !!slug);
  const { data: articlesForTheater } = useArticlesForTheater(slug ?? "", isTheaterRoute && !!slug);
  const relatedArticles = isMovieRoute ? (articlesForMovie ?? []) : (articlesForTheater ?? []);

  const movieIdForPopularity = useMemo(() => {
    if (type !== "movie" || !slug) return undefined;
    const fromList = moviesEnriched?.find((m) => m.slug === slug)?.id;
    if (fromList) return fromList;
    return movieBySlug?.id;
  }, [type, slug, moviesEnriched, movieBySlug]);

  const { data: moviePopularity } = useMoviePopularity(movieIdForPopularity);

  const event =
    type === "movie"
      ? movieBySlug ?? movieFromList
      : theaterShows?.find((s) => s.slug === slug);

  const isLoading =
    type === "movie"
      ? moviesLoading || (!!slug && !movieFromList && movieBySlugLoading)
      : theaterLoading;
  const eventShowtimes = useMemo((): StrapiShowtime[] => {
    const list = showtimes ?? [];
    if (!slug || type !== "movie") return [];
    const now = new Date();
    const filtered = list.filter((st) => st.movieSlug === slug && showtimeIsUpcoming(st, now));
    return [...filtered].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  }, [showtimes, slug, type]);

  const eventPerformances = useMemo((): StrapiTheaterPerformance[] => {
    const list = theaterPerformances ?? [];
    if (!slug || type !== "theater") return [];
    const now = new Date();
    const filtered = list.filter(
      (p) => p.theaterShowSlug === slug && scheduleSlotIsUpcoming(p, now),
    );
    return [...filtered].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  }, [theaterPerformances, slug, type]);

  const performancesByVenue = useMemo(
    () => groupTheaterPerformancesByVenue(eventPerformances, venues ?? []),
    [eventPerformances, venues],
  );

  const performanceVenueNames = useMemo(() => {
    const names = new Set<string>();
    for (const group of performancesByVenue) {
      if (group.venueName.trim()) names.add(group.venueName.trim());
    }
    return [...names];
  }, [performancesByVenue]);

  const hasTheaterPerformances = eventPerformances.length > 0;

  const groupShowtimesByVenue = useCallback(
    (list: StrapiShowtime[]) => {
      const m = new Map<string, StrapiShowtime[]>();
      for (const st of list) {
        const key = cinemaGroupKey(st, venues);
        if (!m.has(key)) m.set(key, []);
        m.get(key)!.push(st);
      }
      return sortVenueShowingsBlocks(
        [...m.entries()].map(([key, slots]) => {
          const sorted = [...slots].sort(
            (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
          );
          const { venueName, venue } = resolveCinemaGroupFromShowtimes(sorted, venues ?? []);
          return { key, venueName, slots: sorted, venue };
        }),
        favoriteIds,
        (a, b) => a.venueName.localeCompare(b.venueName, "el"),
      );
    },
    [venues, favoriteIds],
  );

  const [movieDayFilter, setMovieDayFilter] = useState<MovieDetailDayFilter>("all");
  const [movieAreaFilter, setMovieAreaFilter] = useState<VenueAreaKey | null>(null);
  const [movieDistrictFilter, setMovieDistrictFilter] = useState<AthensDistrictKey | null>(null);

  const movieShowtimeFilterOptions = useMemo(
    () => movieDetailShowtimeFilterOptions(eventShowtimes, venues ?? []),
    [eventShowtimes, venues],
  );

  const filteredEventShowtimes = useMemo(
    () =>
      filterMovieDetailShowtimes(eventShowtimes, venues ?? [], {
        dayFilter: movieDayFilter,
        areaFilter: movieAreaFilter,
        districtFilter: movieDistrictFilter,
      }),
    [eventShowtimes, venues, movieDayFilter, movieAreaFilter, movieDistrictFilter],
  );

  const showtimesByVenue = useMemo(
    () => groupShowtimesByVenue(eventShowtimes),
    [eventShowtimes, groupShowtimesByVenue],
  );

  const filteredShowtimesByVenue = useMemo(
    () => groupShowtimesByVenue(filteredEventShowtimes),
    [filteredEventShowtimes, groupShowtimesByVenue],
  );

  const movieShowtimesFilteredEmpty =
    eventShowtimes.length > 0 && filteredEventShowtimes.length === 0;

  const focusedShowtime = useMemo((): StrapiShowtime | null => {
    if (type !== "movie" || !eventShowtimes.length) return null;
    if (deepLink.showtimeId != null) {
      return eventShowtimes.find((st) => st.id === deepLink.showtimeId) ?? null;
    }
    if (deepLink.datetime) {
      const target = new Date(deepLink.datetime).getTime();
      if (Number.isNaN(target)) return null;
      let best: StrapiShowtime | null = null;
      let bestDiff = Infinity;
      for (const st of eventShowtimes) {
        if (
          deepLink.venueSlug &&
          st.venueSlug?.trim().toLowerCase() !== deepLink.venueSlug.trim().toLowerCase()
        ) {
          continue;
        }
        const diff = Math.abs(new Date(st.datetime).getTime() - target);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = st;
        }
      }
      return bestDiff <= 3 * 60 * 60 * 1000 ? best : null;
    }
    return null;
  }, [type, eventShowtimes, deepLink]);

  const movieSeoHint = useMemo(() => {
    const focusVenue = focusedShowtime
      ? showtimesByVenue.find((g) => g.slots.some((s) => s.id === focusedShowtime.id))?.venueName
      : undefined;
    return {
      venueNames: showtimesByVenue.map((group) => group.venueName).filter(Boolean),
      venueCount: showtimesByVenue.length,
      focusVenueName: focusVenue,
      focusDatetime: focusedShowtime?.datetime,
    };
  }, [showtimesByVenue, focusedShowtime]);

  useEffect(() => {
    if (type !== "movie" || isLoading) return;
    const wantsScroll =
      typeof window !== "undefined" &&
      (window.location.hash.includes("showtimes") || deepLink.showtimeId != null || Boolean(deepLink.datetime));
    if (!wantsScroll) return;
    const timer = window.setTimeout(() => {
      if (deepLink.showtimeId != null) {
        document.getElementById(`st-${deepLink.showtimeId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      document.getElementById("showtimes")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [type, isLoading, deepLink.showtimeId, deepLink.datetime]);

  const mergedMovieForDisplay = useMemo((): (StrapiMovie & { summerScreening?: boolean }) | null => {
    if (type !== "movie" || !slug) return null;
    const raw = movieBySlug ?? movieFromList;
    if (!raw) return null;
    const mov = raw as StrapiMovie;
    const st =
      eventShowtimes.find(
        (s) =>
          s.movieSlug === slug ||
          (mov.id > 0 && s.movieId != null && Number(s.movieId) === Number(mov.id)),
      ) ?? eventShowtimes[0];
    const base = st ? mergeMovieWithShowtimeFields(mov, st) : mov;
    const summerScreening = eventShowtimes.some(showtimeShowsOutdoorLabel);
    return summerScreening ? { ...base, summerScreening: true } : base;
  }, [type, slug, movieBySlug, movieFromList, eventShowtimes]);

  const genreLabel = useMemo(() => {
    if (!event) return "";
    const isM = type === "movie";
    const mov = isM ? (event as StrapiMovie) : null;
    if (!isM || !mov) return theaterGenreLabel(event.genre);
    const fromMovie = resolveMovieGenreLine(mov.id, mov.slug, mov, genreCatalog?.linkIndex);
    if (fromMovie) return fromMovie;
    const list = showtimes ?? [];
    const st =
      list.find((s) => s.movieId != null && Number(s.movieId) === Number(mov.id) && (s.movieGenre ?? "").trim()) ??
      list.find((s) => typeof slug === "string" && s.movieSlug === slug && (s.movieGenre ?? "").trim());
    return (st?.movieGenre ?? "").trim();
  }, [event, type, showtimes, slug, genreCatalog]);

  const castList = useMemo((): string[] => (event ? normalizeCastFromStrapi(event.cast) : []), [event]);

  const isMovieEarly = type === "movie";
  const movieEarly = isMovieEarly && event ? (event as StrapiMovie) : null;
  const theaterEarly = type === "theater" && event ? (event as StrapiTheaterShow) : null;

  const genreLinkItems = useMemo(
    () => (movieEarly ? movieGenreLinkItems(movieEarly, movieGenresList) : []),
    [movieEarly, movieGenresList],
  );

  const detailJsonLd = useMemo(() => {
    if (isLoading || !event || !slug) return null;
    if (movieEarly) {
      return buildMovieDetailJsonLd({
        movie: movieEarly,
        slug,
        genreLabel,
        showtimes: eventShowtimes,
        venues: venues ?? [],
      });
    }
    if (theaterEarly) {
      return buildTheaterDetailJsonLd({ show: theaterEarly, slug, venueNames: performanceVenueNames });
    }
    return null;
  }, [isLoading, event, slug, movieEarly, theaterEarly, genreLabel, eventShowtimes, venues, performanceVenueNames]);

  usePageSeo(
    useMemo(() => {
      if (isLoading) {
        return { title: type === "movie" ? "Ταινία" : "Παράσταση", enabled: false };
      }
      if (!event) {
        return {
          ...staticPageSeo.notFound,
          path: slug ? (type === "movie" ? `/movies/${slug}` : `/theater/${slug}`) : undefined,
        };
      }
      if (isMovieEarly && movieEarly) {
        const seo = movieDetailSeo(movieEarly, genreLabel, movieSeoHint);
        return {
          title: seo.title,
          description: seo.description,
          ogTitle: seo.ogTitle,
          ogDescription: seo.ogDescription,
          path: `/movies/${slug}`,
          image: movieEarly.posterUrl,
          imageAlt: posterAltForMovie(movieEarly),
          ogType: "video.movie" as const,
          videoUrl: youtubeEmbedUrl(movieEarly.trailerUrl) ?? undefined,
        };
      }
      const show = event as StrapiTheaterShow;
      return {
        title: show.title,
        description: theaterPageDescription(show),
        path: `/theater/${slug}`,
        image: show.posterUrl,
        imageAlt: posterAltForTheater(show.title),
        ogType: "article" as const,
      };
    }, [isLoading, event, type, slug, genreLabel, isMovieEarly, movieEarly, movieSeoHint]),
  );

  if (isLoading) {
    return (
      <div className={PAGE_BELOW_NAV_CLASS}>
        <LoadingState />
      </div>
    );
  }

  if (!event) {
    return (
      <div className={cn(PAGE_BELOW_NAV_CLASS, "flex items-center justify-center")}>
        <div className="text-center">
          <h1 className="font-display text-2xl mb-2">Δεν βρέθηκε</h1>
          <Link to="/" className="text-primary text-base">Αρχική</Link>
        </div>
      </div>
    );
  }

  const isMovie = type === "movie";
  const movie = isMovie ? (mergedMovieForDisplay ?? (event as StrapiMovie)) : null;
  const theaterShow = !isMovie ? (event as StrapiTheaterShow) : null;

  const theaterPerformancePriceLabel = (p: StrapiTheaterPerformance): string | null => {
    if (p.soldOut || theaterShow?.soldOut) return null;
    if (p.price != null && Number.isFinite(p.price)) {
      const rounded = Math.round(p.price * 100) / 100;
      return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2).replace(/\.?0+$/, "")}€`;
    }
    if (theaterShow) {
      return theaterPriceLabel(resolveTheaterTicketPrices(theaterShow));
    }
    return null;
  };

  const theaterPerformancesSection = !isMovie ? (
    <section
      id="theater-performances"
      className="scroll-mt-24 rounded-xl border border-[#13143E]/12 bg-[#13143E]/[0.03] p-4 md:p-6"
    >
      <div className="mb-4 flex items-center gap-2.5 md:mb-5">
        <MapPin className="h-4 w-4 shrink-0 text-[#13143E]/70" aria-hidden />
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground md:text-xl">Πού & πότε παίζεται</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Επερχόμενες εμφανίσεις ανά χώρο</p>
        </div>
      </div>
      {performancesLoading && theaterPerformances === undefined ? (
        <p className="text-sm text-muted-foreground" role="status">
          Φόρτωση εμφανίσεων…
        </p>
      ) : null}
      {!performancesLoading && !hasTheaterPerformances ? (
        <p className="text-sm text-muted-foreground">
          Δεν υπάρχουν καταχωρημένες επερχόμενες εμφανίσεις για αυτή την παράσταση.
        </p>
      ) : null}
      {hasTheaterPerformances ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {performancesByVenue.map(({ key, venueName, slots, venue }) => {
            if (!slots.length) return null;
            return (
              <div
                key={key}
                className="flex min-h-0 flex-col rounded-lg border border-border/80 bg-card/50 p-3 sm:p-4"
              >
                <div className="mb-2 border-b border-border/60 pb-2">
                  <CinemaVenueLinks
                    venueName={venueName}
                    venue={venue}
                    programHref={venueProgramHref(venue)}
                    showProgramButton={Boolean(venueProgramHref(venue))}
                    compact
                  />
                </div>
                <ShowtimesExpandable listClassName="min-h-0 flex-1">
                  {slots.map((p) => (
                    <ScheduleCompactRow
                      key={p.id}
                      slot={p}
                      hallName={p.hallName}
                      priceLabel={theaterPerformancePriceLabel(p)}
                      soldOut={Boolean(p.soldOut || theaterShow?.soldOut)}
                      emphasized
                    />
                  ))}
                </ShowtimesExpandable>
                {isValidExternalUrl(venue?.moreLink) ? (
                  <div className="mt-2 border-t border-border/50 pt-2">
                    <VenueBookingLink venue={venue} compact />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  ) : null;

  const related = isMovie
    ? sortMoviesByCinemaCount(
        (moviesEnriched ?? []).filter((m) => m.slug !== slug),
        showtimes ?? [],
        venues,
        (st) => showtimeIsUpcoming(st),
        favoriteIds,
      ).slice(0, 4)
    : (theaterShows ?? []).filter((s) => s.slug !== slug).slice(0, 4);

  const eventEditorialReviews = (editorialReviews ?? []).filter((r) =>
    isMovie && movie ? reviewContentMatchesMovie(r.contentTitle, movie) : r.contentTitle === event.title,
  );
  const eventUserReviews = (userReviews ?? []).filter((r) =>
    isMovie && movie
      ? r.movieId === movie.id || reviewContentMatchesMovie(r.contentTitle, movie)
      : r.contentTitle === event.title,
  );

  const isSeen =
    isMovie && movie?.id
      ? (profile?.seenMovies ?? []).some((m) => m.id === movie.id)
      : theaterShow?.id
        ? (profile?.seenTheaterShows ?? []).some((s) => s.id === theaterShow.id)
        : false;

  const hasMyReview = userHasReviewedContent(myReviews, {
    contentType: isMovie ? "movie" : "theater",
    movieId: movie?.id,
    theaterShowId: theaterShow?.id,
  });

  const showRateReminder = isAuthenticated && isSeen && !hasMyReview;

  const headline = isMovie && movie ? movieTitleLines(movie) : { primary: event.title, secondary: undefined as string | undefined };
  const movieSeo =
    isMovie && movie ? movieDetailSeo(movie, genreLabel, movieSeoHint) : null;

  const movieSharePath = (() => {
    if (!slug || !isMovie) return slug ? `/movies/${slug}` : "/movies";
    if (focusedShowtime?.id) {
      return buildMovieShowtimeShareUrl(slug, { showtimeId: focusedShowtime.id });
    }
    if (focusedShowtime?.datetime) {
      return buildMovieShowtimeShareUrl(slug, {
        datetime: focusedShowtime.datetime,
        venueSlug: focusedShowtime.venueSlug,
      });
    }
    return `/movies/${slug}`;
  })();

  const breadcrumbItems = isMovie
    ? [
        { label: "Αρχική", href: "/" },
        { label: "Ταινίες", href: "/movies" },
        { label: headline.primary },
      ]
    : [
        { label: "Αρχική", href: "/" },
        { label: "Θέατρο", href: "/theater" },
        { label: headline.primary },
      ];

  const imdbRating = movie ? resolveImdbRating(movie) : null;

  const hasCast = castList.length > 0;

  const directorLabel = (event.director ?? "").trim();
  const hasDirector = directorLabel.length > 0;
  const hasDuration = typeof event.duration === "number" && Number.isFinite(event.duration) && event.duration > 0;
  /** Για ταινίες: πάντα τμήμα «Πληροφορίες» ώστε να εμφανίζεται έστω και μόνο το είδος. */
  const hasInfoBlock = isMovie || hasDirector || hasCast || Boolean(genreLabel) || hasDuration;
  const trailerEmbedUrl = isMovie && movie ? youtubeEmbedUrl(movie.trailerUrl) : null;

  const infoField = (label: string, value: ReactNode) => (
    <div className="flex min-h-[5.5rem] min-w-0 flex-col justify-center rounded-lg border border-border/60 bg-muted/35 p-3 md:min-h-0 md:rounded-none md:border-0 md:bg-transparent md:p-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:text-xs">{label}</span>
      <div className="mt-1.5 text-sm font-medium leading-snug text-foreground md:mt-1 md:text-base">{value}</div>
    </div>
  );

  const movieInfoAside = hasInfoBlock ? (
    <aside
      className={cn(
        "card-elevated h-fit w-full rounded-xl px-4 py-5",
        /* Edge-to-edge χωρίς transform/100vw — αποφεύγει «zoom» στο scroll (iOS Safari). */
        "max-md:-mx-6 max-md:rounded-none max-md:border-x-0 max-md:px-6",
        "md:sticky md:top-28 md:rounded-2xl md:p-5 lg:top-32",
      )}
    >
      <h2 className="font-display mb-3 text-left text-base font-semibold md:mb-4 md:text-lg">Πληροφορίες</h2>
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-2 md:gap-x-4 md:gap-y-3 lg:grid-cols-3">
        {hasDirector ? infoField("Σκηνοθεσία", directorLabel) : null}
        {isMovie ? (
          infoField(
            "Είδος",
            genreLinkItems.length ? (
              <GenreLinks items={genreLinkItems} />
            ) : genreLabel ? (
              <span className="line-clamp-3 text-sm leading-snug">{genreLabel}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
          )
        ) : genreLabel ? (
          infoField("Είδος", genreLabel)
        ) : null}
        {hasDuration ? infoField("Διάρκεια", `${event.duration}′`) : null}
        {movie?.language?.trim() ? infoField("Γλώσσα", movie.language.trim()) : null}
        {movie?.isDubbed ? infoField("Ήχος", "Μεταγλωτ.") : null}
        {movie?.releaseDate?.trim()
          ? infoField(
              "Κυκλοφορία",
              new Date(movie.releaseDate.trim() + "T12:00:00").toLocaleDateString("el-GR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            )
          : null}
      </div>
      {hasCast ? (
        <div className="mt-3 border-t border-border/80 pt-3 md:mt-4 md:pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:text-xs">Ηθοποιοί</p>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:flex md:flex-wrap" role="list">
            {castList.slice(0, 6).map((name, i) => (
              <li key={`${name}-${i}`} className="min-w-0">
                <span className="flex min-h-[2.5rem] w-full items-center justify-center rounded-lg border border-border/60 bg-muted/35 px-2 py-1.5 text-center text-xs font-medium leading-snug text-foreground md:inline-flex md:min-h-0 md:w-auto md:rounded-md md:px-2.5 md:text-sm">
                  {name}
                </span>
              </li>
            ))}
            {castList.length > 6 ? (
              <li className="text-xs text-muted-foreground md:text-sm">+{castList.length - 6}</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </aside>
  ) : null;

  const hasMovieShowtimes = eventShowtimes.length > 0;

  const movieShowtimesSection = isMovie ? (
    <section
      id="showtimes"
      className="scroll-mt-24 rounded-xl border border-[#13143E]/12 bg-[#13143E]/[0.03] p-4 md:p-6"
    >
      <div className="mb-4 flex items-center gap-2.5 md:mb-5">
        <MapPin className="h-4 w-4 shrink-0 text-[#13143E]/70" aria-hidden />
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground md:text-xl">Πού & πότε παίζεται</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Όλες οι επερχόμενες προβολές</p>
        </div>
      </div>
      {showtimesLoading && showtimes === undefined ? (
        <p className="text-sm text-muted-foreground" role="status">
          Φόρτωση προβολών…
        </p>
      ) : null}
      {!showtimesLoading && !hasMovieShowtimes ? (
        <p className="text-sm text-muted-foreground">
          Δεν υπάρχουν καταχωρημένες επερχόμενες προβολές για αυτή την ταινία.
        </p>
      ) : null}
      {hasMovieShowtimes ? (
        <MovieDetailShowtimeFilters
          dayFilter={movieDayFilter}
          onDayFilterChange={setMovieDayFilter}
          areaFilter={movieAreaFilter}
          onAreaFilterChange={setMovieAreaFilter}
          districtFilter={movieDistrictFilter}
          onDistrictFilterChange={setMovieDistrictFilter}
          options={movieShowtimeFilterOptions}
        />
      ) : null}
      {movieShowtimesFilteredEmpty ? (
        <p className="text-sm text-muted-foreground">
          Δεν βρέθηκαν προβολές με αυτά τα φίλτρα. Δοκίμασε άλλη ημέρα ή περιοχή.
        </p>
      ) : null}
      {hasMovieShowtimes && !movieShowtimesFilteredEmpty ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {filteredShowtimesByVenue.map(({ key, venueName, slots, venue }) => {
            if (!slots.length) return null;
            return (
              <div
                key={key}
                className="flex min-h-0 flex-col rounded-lg border border-border/80 bg-card/50 p-3 sm:p-4"
              >
                <div className="mb-2 border-b border-border/60 pb-2">
                  <CinemaVenueLinks
                    venueName={venueName}
                    venue={venue}
                    programHref={moviesHrefForShowtimes(slots, venues, key)}
                    showProgramButton
                    compact
                  />
                  {slots.some(showtimeIsWeekBlock) && venue ? (
                    <VenueDayPricesTable venue={venue} className="mt-2" />
                  ) : null}
                </div>
                <ShowtimesExpandable listClassName="min-h-0 flex-1">
                  {slots.map((st) => (
                    <ShowtimeCompactRow
                      key={st.id}
                      st={st}
                      venue={venue}
                      emphasized
                      highlighted={focusedShowtime?.id != null && st.id === focusedShowtime.id}
                    />
                  ))}
                </ShowtimesExpandable>
                {isValidExternalUrl(venue?.moreLink) ? (
                  <div className="mt-2 border-t border-border/50 pt-2">
                    <VenueBookingLink venue={venue} compact />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  ) : null;

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {detailJsonLd ? <JsonLd data={detailJsonLd} /> : null}
      <section
        className={cn(
          "relative overflow-hidden bg-[#13143E]",
          isMovie
            ? undefined
            : theaterShow?.posterUrl
              ? "md:min-h-[min(52vh,640px)]"
              : "min-h-[50vh]",
        )}
      >
        {isMovie && movie?.posterUrl ? (
          <PosterPicture
            src={movie.posterUrl}
            srcSet={movie.posterSrcSet}
            alt=""
            width={800}
            height={1200}
            fetchPriority="high"
            loading="eager"
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.22] blur-2xl"
          />
        ) : theaterShow?.posterUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={theaterShow.posterUrl}
              alt={posterAltForTheater(theaterShow.title)}
              width={1200}
              height={1800}
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-35"
            />
          </>
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#13143E] via-[#13143E]/75 to-[#13143E]/35" />

        <div className={isMovie ? PAGE_MOVIE_DETAIL_HERO_INNER_CLASS : PAGE_DETAIL_HERO_INNER_CLASS}>
          <div
            className={cn(
              "animate-fade-in-up",
              (isMovie && movie?.posterUrl) || (!isMovie && theaterShow?.posterUrl)
                ? cn(
                    "flex flex-col md:flex-row md:items-end md:justify-between",
                    isMovie ? "gap-4 md:gap-8 lg:gap-10" : "gap-3 md:gap-10 lg:gap-14",
                  )
                : "flex h-full items-end",
            )}
          >
            <div
              className={cn(
                "min-w-0 max-w-3xl",
                (isMovie && movie?.posterUrl) || (!isMovie && theaterShow?.posterUrl) ? "md:flex-1 md:pb-1" : "",
              )}
            >
            <Link
              to={isMovie ? "/movies" : "/theater"}
              className={cn(
                "inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white",
                isMovie ? "mb-2" : "mb-4",
              )}
            >
              <ArrowLeft className="w-4 h-4" /> Πίσω στις {isMovie ? "Ταινίες" : "Παραστάσεις"}
            </Link>

            {!isMovie && theaterShow?.posterUrl ? (
              <figure className="mx-auto mb-2 w-full max-w-[min(100%,14rem)] shrink-0 md:hidden">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#1a1844]/90 shadow-2xl shadow-black/45 ring-1 ring-white/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={theaterShow.posterUrl}
                    alt={posterAltForTheater(theaterShow.title)}
                    width={1040}
                    height={780}
                    fetchPriority="high"
                    loading="eager"
                    decoding="async"
                    className="h-full w-full object-contain object-center"
                  />
                </div>
              </figure>
            ) : null}

            {movie && (imdbRating != null || movie.ageRating?.trim() || moviePopularity?.isPopular) ? (
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {imdbRating != null ? <ImdbRatingBadge rating={imdbRating} variant="hero" /> : null}
                {moviePopularity?.isPopular ? <PopularBadge /> : null}
                {movie.ageRating?.trim() ? (
                  <span className="text-sm text-white/60">{movie.ageRating}</span>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-start justify-between gap-3">
            <h1
              className={cn(
                "font-display font-bold text-white",
                isMovie ? "text-2xl md:text-4xl" : "text-3xl md:text-5xl",
                isMovie && movieSeo
                  ? headline.secondary
                    ? "mb-2"
                    : "mb-3"
                  : headline.secondary
                    ? "mb-2"
                    : theaterShow?.posterUrl && !isMovie
                      ? "mb-2 md:mb-4"
                      : isMovie
                        ? "mb-3"
                        : "mb-4",
              )}
            >
              {isMovie && movieSeo ? movieSeo.h1 : headline.primary}
            </h1>
            {isMovie && movie?.id ? (
              <div className="flex shrink-0 items-center gap-2">
                <SeenButton
                  kind="movie"
                  entityId={movie.id}
                  showLabel
                  className="border-white/20 bg-black/30 text-white hover:text-sky-200"
                />
                <FavoriteButton kind="movie" entityId={movie.id} className="shrink-0 border-white/20 bg-black/30 text-white hover:text-rose-300" />
              </div>
            ) : theaterShow?.id ? (
              <SeenButton
                kind="theater"
                entityId={theaterShow.id}
                showLabel
                className="shrink-0 border-white/20 bg-black/30 text-white hover:text-sky-200"
              />
            ) : null}
            </div>
            {isMovie && movieSeo ? (
              <p className="font-display text-lg md:text-xl font-medium text-white/80 mb-2">{movieSeo.subtitle}</p>
            ) : null}
            {headline.secondary ? (
              <p className="font-display text-xl md:text-3xl font-medium text-white/85 mb-4">{headline.secondary}</p>
            ) : null}

            <div
              className={cn(
                "flex flex-wrap items-center gap-3 text-white/60",
                isMovie ? "mb-4 text-sm md:text-base" : "mb-6 text-base",
              )}
            >
              {hasDuration ? (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {event.duration} λεπτά
                </span>
              ) : null}
              {movie ? (
                genreLinkItems.length ? (
                  <GenreLinks items={genreLinkItems} prefix="Είδος" variant="hero" />
                ) : genreLabel ? (
                  <span className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-sm font-medium text-white">
                    Είδος · {genreLabel}
                  </span>
                ) : (
                  <span className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-sm font-medium text-white/75">
                    Είδος · —
                  </span>
                )
              ) : genreLabel ? (
                <span>{genreLabel}</span>
              ) : null}
              {movie?.isDubbed ? (
                <span className="rounded border border-amber-400/50 bg-amber-500/25 px-2 py-0.5 text-sm font-semibold text-amber-100">
                  Μεταγλωτισμένη
                </span>
              ) : null}
              {movie?.language?.trim() ? (
                <span className="flex items-center gap-1">
                  <Globe className="w-4 h-4" /> {movie.language.trim()}
                </span>
              ) : null}
              {theaterShow && isTouringTheaterShow(theaterShow) ? (
                <span className="rounded border border-amber-400/50 bg-amber-500/25 px-2 py-0.5 text-sm font-semibold text-amber-100">
                  Περιοδεία
                </span>
              ) : null}
              {theaterShow && formatTheaterRunPeriod(theaterShow) ? (
                <span className="flex items-center gap-1">{formatTheaterRunPeriod(theaterShow)}</span>
              ) : null}
            </div>

            {theaterShow ? <TheaterTicketHeroPreview show={theaterShow} /> : null}

            <div
              className={cn("flex flex-wrap gap-3", hasTheaterPerformances ? "mt-6" : "mt-0")}
            >
              {isMovie ? (
                <a
                  href="#showtimes"
                  className="inline-flex items-center rounded bg-white px-5 py-2.5 text-sm font-semibold text-[#13143E] transition-colors hover:bg-white/90 md:text-base md:px-6 md:py-3"
                >
                  Προβολές & τιμές
                </a>
              ) : hasTheaterPerformances ? (
                <a
                  href="#theater-performances"
                  className="inline-flex items-center rounded bg-white px-6 py-3 text-base font-semibold text-[#13143E] transition-colors hover:bg-white/90"
                >
                  Εμφανίσεις & τιμές
                </a>
              ) : null}
              {isMovie && trailerEmbedUrl ? (
                <a
                  href="#trailer"
                  className="inline-flex items-center gap-1.5 rounded border border-white/35 bg-white/10 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-white/20"
                >
                  <Play className="h-4 w-4 shrink-0" aria-hidden />
                  Τρέιλερ
                </a>
              ) : null}
              {isMovie && slug ? (
                <SharePageButton
                  variant="hero"
                  path={movieSharePath}
                  title={headline.primary}
                />
              ) : null}
            </div>
            </div>

            {isMovie && movie?.posterUrl ? (
              <figure className="mx-auto w-[8.5rem] shrink-0 sm:w-36 md:mx-0 md:w-44 lg:w-48">
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[#1a1844]/90 shadow-2xl shadow-black/45 ring-1 ring-white/20">
                  <PosterPicture
                    src={movie.posterUrl}
                    srcSet={movie.posterSrcSet}
                    alt={posterAltForMovie(movie)}
                    width={512}
                    height={768}
                    fetchPriority="high"
                    loading="eager"
                    sizes="(max-width: 768px) 152px, 240px"
                    className="h-full w-full object-contain object-center"
                  />
                  <MoviePosterMeta movie={movie} />
                </div>
              </figure>
            ) : !isMovie && theaterShow?.posterUrl ? (
              <figure className="mx-auto hidden w-full max-w-[11rem] shrink-0 sm:max-w-[12rem] md:mx-0 md:block md:max-w-[14rem] lg:max-w-[15rem]">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#1a1844]/90 shadow-2xl shadow-black/45 ring-1 ring-white/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={theaterShow.posterUrl}
                    alt={posterAltForTheater(theaterShow.title)}
                    width={1040}
                    height={780}
                    fetchPriority="high"
                    loading="eager"
                    decoding="async"
                    className="h-full w-full object-contain object-center"
                  />
                </div>
              </figure>
            ) : null}
          </div>
        </div>
      </section>

      {isMovie && movieSeo ? (
        <MovieDetailIntro movieName={headline.primary} intro={movieSeo.intro} />
      ) : null}

      <div
        className={cn(
          "container space-y-10 md:space-y-12",
          isMovie ? "mt-8 md:mt-10" : "mt-6 md:mt-8",
        )}
      >
        <PageBreadcrumbs items={breadcrumbItems} />
        {isMovie ? (
          <>
            <section className="max-w-5xl animate-fade-in-up md:max-w-6xl">
              <div
                className={cn(
                  "flex flex-col gap-5",
                  hasInfoBlock &&
                    "md:grid md:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] md:grid-rows-[auto_auto] md:items-start md:gap-x-8 md:gap-y-5",
                )}
              >
                {hasInfoBlock ? (
                  <div className="order-1 md:col-start-2 md:row-span-2 md:row-start-1 md:self-start">
                    {movieInfoAside}
                  </div>
                ) : null}
                <div className="order-2 min-w-0 md:col-start-1 md:row-start-1">
                  <h2 className="font-display mb-3 text-xl font-semibold">Υπόθεση</h2>
                  <p className="text-base leading-relaxed text-muted-foreground">{event.synopsis}</p>
                </div>
                <section id="trailer" className="order-3 scroll-mt-24 md:col-start-1 md:row-start-2 md:max-w-2xl">
                  <h2 className="font-display mb-4 text-xl font-semibold">Τρέιλερ</h2>
                  {trailerEmbedUrl ? (
                    <div className="aspect-video max-w-xl overflow-hidden rounded-xl border border-border/80 bg-black shadow-sm md:max-w-none">
                      <iframe
                        title={`Τρέιλερ — ${headline.primary}`}
                        src={trailerEmbedUrl}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Δεν υπάρχει διαθέσιμο τρέιλερ για αυτή την ταινία.</p>
                  )}
                </section>
              </div>
            </section>
            {movieShowtimesSection}
          </>
        ) : (
          <>
            <section className="max-w-2xl animate-fade-in-up">
              <h2 className="font-display mb-3 text-xl font-semibold">Υπόθεση</h2>
              <p className="text-base leading-relaxed text-muted-foreground">{event.synopsis}</p>
              {theaterShow ? (
                <div className="mt-5">
                  <TheaterShowMoreLink show={theaterShow} />
                </div>
              ) : null}
            </section>
            {theaterPerformancesSection}
            {movieInfoAside}
          </>
        )}

        <RelatedArticlesSection
          articles={relatedArticles}
          title={isMovie ? "Άρθρα για αυτή την ταινία" : "Άρθρα για αυτή την παράσταση"}
        />

        {eventEditorialReviews.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-semibold mb-4">Κριτικές Συντακτών</h2>
            {eventEditorialReviews.map((r) => (
              <div key={r.id} className="card-elevated p-6 border-l-4 border-l-[#13143E] mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-base text-foreground">{r.score}/10</span>
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{r.title}</h3>
                <p className="text-muted-foreground text-base">{r.body}</p>
                <p className="text-sm text-muted-foreground mt-3">— {r.author}</p>
              </div>
            ))}
          </section>
        )}

        {eventUserReviews.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-semibold mb-4">Κριτικές Χρηστών</h2>
            {eventUserReviews.map((r) => (
              <div key={r.id} className="card-elevated p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-base">{r.userName}</span>
                  <span className="text-sm font-bold">{r.rating}/5 ★</span>
                </div>
                <p className="text-base text-muted-foreground">{r.body}</p>
              </div>
            ))}
          </section>
        )}

        {showRateReminder ? (
          <RateReminderBanner
            title={headline.primary}
            className="mb-6"
          />
        ) : null}

        <div id="write-review" className="card-elevated mx-auto max-w-md border border-[#13143E]/12 p-6 md:p-8 scroll-mt-28">
          <h3 className="font-display mb-6 text-center text-xl font-semibold text-[#13143E]">Γράψε Κριτική</h3>
          {isAuthenticated ? (
            <WriteReviewForm
              contentType={isMovie ? "movie" : "theater"}
              movieId={isMovie && movie ? movie.id : undefined}
              theaterShowId={!isMovie && theaterShow ? theaterShow.id : undefined}
              onSuccess={() => {
                void queryClient.invalidateQueries({ queryKey: ["myReviews"] });
              }}
            />
          ) : (
            <div className="text-center">
              <p className="mb-4 text-base text-muted-foreground">Σύνδεση για να γράψεις κριτική</p>
              <Button
                size="lg"
                className="h-11 bg-[#13143E] px-8 font-semibold text-white hover:bg-[#1C1D62]"
                asChild
              >
                <Link to="/profile">Σύνδεση</Link>
              </Button>
            </div>
          )}
        </div>

        <section>
          <h2 className="font-display text-xl font-semibold mb-4">Μπορεί να σου αρέσει</h2>
          <div
            className={cn(
              "grid gap-4 items-stretch",
              isMovie ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3",
            )}
          >
            {related.map((item, i) => {
              const itemTl = isMovie ? movieTitleLines(item as StrapiMovie) : { primary: item.title, secondary: undefined as string | undefined };
              return (
              <div key={item.id} className="flex h-full min-h-0">
                <EventCard
                  slug={item.slug}
                  title={itemTl.primary}
                  titleSecondary={itemTl.secondary}
                  subtitle={isMovie ? "" : item.director}
                  genre={isMovie ? "" : theaterGenreLabel((item as StrapiTheaterShow).genre)}
                  duration={item.duration}
                  imdbRating={isMovie ? resolveImdbRating(item as StrapiMovie) : undefined}
                  posterUrl={isMovie ? (item as StrapiMovie).posterUrl : item.posterUrl}
                  posterSrcSet={isMovie ? (item as StrapiMovie).posterSrcSet : undefined}
                  isDubbed={isMovie ? (item as StrapiMovie).isDubbed : false}
                  type={type}
                  badge={
                    !isMovie
                      ? (item as StrapiTheaterShow).soldOut
                        ? "SOLD OUT"
                        : (item as StrapiTheaterShow).isPremiere
                          ? "Πρεμιέρα"
                          : (item as StrapiTheaterShow).isLastShows
                            ? "Τελευταίες"
                            : undefined
                      : undefined
                  }
                  uniformMovieSizing={isMovie}
                  compactMovieMeta={isMovie}
                  index={i}
                  className="w-full flex-1"
                />
              </div>
            );})}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default EventDetail;