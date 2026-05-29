import { QueryClient, dehydrate, type DehydratedState } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  homeNeedsShowtimes,
  homeNeedsTheater,
  resolveHomepageLayout,
  type MappedHomepage,
} from "@/config/home";
import { isMoviesFilterListPath } from "@/lib/moviesFilterPaths";
import { finalizeBootstrapCache } from "@/lib/slimDehydrate";

const queryDefaults = {
  staleTime: 300_000,
  retry: 1,
} as const;

function matchMovieSlug(path: string): string | null {
  const m = path.match(/^\/movies\/([^/]+)$/);
  return m?.[1] ?? null;
}

function matchTheaterSlug(path: string): string | null {
  const m = path.match(/^\/theater\/([^/]+)$/);
  return m?.[1] ?? null;
}

function matchDiningSlug(path: string): string | null {
  const m = path.match(/^\/dining\/([^/]+)$/);
  return m?.[1] ?? null;
}

function matchReviewSlug(path: string): string | null {
  const m = path.match(/^\/reviews\/([^/]+)$/);
  return m?.[1] ?? null;
}

function matchMoviesVenueSlug(path: string): string | null {
  const m = path.match(/^\/movies\/venue\/([^/]+)$/);
  return m?.[1] ?? null;
}

async function prefetchHomeBundle(qc: QueryClient) {
  await qc.prefetchQuery({ queryKey: ["homepage"], queryFn: api.getHomepage, ...queryDefaults });
  const layout = resolveHomepageLayout(qc.getQueryData<MappedHomepage>(["homepage"]) ?? null);
  const tasks: Promise<unknown>[] = [
    qc.prefetchQuery({ queryKey: ["movies"], queryFn: api.getMovies, ...queryDefaults }),
  ];
  if (homeNeedsShowtimes(layout.sections)) {
    tasks.push(qc.prefetchQuery({ queryKey: ["showtimes"], queryFn: () => api.getShowtimes(), ...queryDefaults }));
  }
  if (homeNeedsTheater(layout.sections)) {
    tasks.push(qc.prefetchQuery({ queryKey: ["theaterShows"], queryFn: api.getTheaterShows, ...queryDefaults }));
  }
  await Promise.all(tasks);
  finalizeBootstrapCache(qc, { trimHomeShowtimes: true, trimHomeMovies: true });
}

/** Λίστα /movies — χωρίς πλήρες catalog στο HTML (client fetch για ταινίες). */
async function prefetchMoviesList(qc: QueryClient) {
  await Promise.all([
    qc.prefetchQuery({ queryKey: ["showtimes"], queryFn: () => api.getShowtimes(), ...queryDefaults }),
    qc.prefetchQuery({ queryKey: ["venues"], queryFn: api.getVenues, ...queryDefaults }),
  ]);
  finalizeBootstrapCache(qc, { trimHomeShowtimes: true, trimVenuesForShowtimes: true });
}

/** Πρόγραμμα ενός σινεμά — showtimes venue μόνο · ταινίες client-side. */
async function prefetchMoviesVenueProgram(qc: QueryClient, venueSlug: string) {
  await Promise.all([
    qc.prefetchQuery({
      queryKey: ["showtimes", venueSlug],
      queryFn: () => api.getShowtimes({ venueSlug }),
      ...queryDefaults,
    }),
    qc.prefetchQuery({ queryKey: ["venues"], queryFn: api.getVenues, ...queryDefaults }),
    qc.prefetchQuery({ queryKey: ["movieGenres"], queryFn: api.getMovieGenres, staleTime: 600_000, retry: 1 }),
  ]);
  finalizeBootstrapCache(qc);
}

async function prefetchMovieDetail(qc: QueryClient, slug: string) {
  await Promise.all([
    qc.prefetchQuery({ queryKey: ["movie", slug], queryFn: () => api.getMovieBySlug(slug) }),
    qc.prefetchQuery({ queryKey: ["showtimes"], queryFn: () => api.getShowtimes(), ...queryDefaults }),
    qc.prefetchQuery({ queryKey: ["venues"], queryFn: api.getVenues, ...queryDefaults }),
    qc.prefetchQuery({ queryKey: ["movieGenres"], queryFn: api.getMovieGenres, staleTime: 600_000, retry: 1 }),
  ]);
  finalizeBootstrapCache(qc, { movieSlug: slug });
}

async function prefetchTheaterDetail(qc: QueryClient, slug: string) {
  await Promise.all([
    qc.prefetchQuery({ queryKey: ["theaterShow", slug], queryFn: () => api.getTheaterShowBySlug(slug) }),
    qc.prefetchQuery({ queryKey: ["theaterShows"], queryFn: api.getTheaterShows, ...queryDefaults }),
  ]);
  finalizeBootstrapCache(qc);
}

/** Prefetch React Query cache για static export / SSR ανά path. */
export async function prefetchRouteData(path: string): Promise<DehydratedState> {
  const normalized = path === "" ? "/" : path.startsWith("/") ? path : `/${path}`;
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 300_000,
        refetchOnWindowFocus: false,
      },
    },
  });

  try {
    const movieSlug = matchMovieSlug(normalized);
    const theaterSlug = matchTheaterSlug(normalized);
    const diningSlug = matchDiningSlug(normalized);
    const reviewSlug = matchReviewSlug(normalized);

    if (normalized === "/") {
      await prefetchHomeBundle(qc);
    } else if (normalized === "/movies" || isMoviesFilterListPath(normalized)) {
      await prefetchMoviesList(qc);
    } else if (matchMoviesVenueSlug(normalized)) {
      await prefetchMoviesVenueProgram(qc, matchMoviesVenueSlug(normalized)!);
    } else if (movieSlug) {
      await prefetchMovieDetail(qc, movieSlug);
    } else if (normalized === "/theater") {
      await qc.prefetchQuery({ queryKey: ["theaterShows"], queryFn: api.getTheaterShows, ...queryDefaults });
    } else if (theaterSlug) {
      await prefetchTheaterDetail(qc, theaterSlug);
    } else if (normalized === "/venues") {
      await Promise.all([
        qc.prefetchQuery({ queryKey: ["venues"], queryFn: api.getVenues, ...queryDefaults }),
        qc.prefetchQuery({ queryKey: ["showtimes"], queryFn: () => api.getShowtimes(), ...queryDefaults }),
      ]);
      finalizeBootstrapCache(qc, { trimHomeShowtimes: true, trimVenuesForShowtimes: true });
    } else if (normalized === "/dining") {
      await qc.prefetchQuery({ queryKey: ["restaurants"], queryFn: api.getRestaurants });
    } else if (diningSlug) {
      await Promise.all([
        qc.prefetchQuery({ queryKey: ["restaurant", diningSlug], queryFn: () => api.getRestaurantBySlug(diningSlug) }),
        qc.prefetchQuery({ queryKey: ["restaurants"], queryFn: api.getRestaurants }),
      ]);
    } else if (normalized === "/reviews") {
      await qc.prefetchQuery({ queryKey: ["editorialReviews"], queryFn: api.getEditorialReviews });
    } else if (reviewSlug) {
      await Promise.all([
        qc.prefetchQuery({
          queryKey: ["editorialReview", reviewSlug],
          queryFn: () => api.getEditorialReviewBySlug(reviewSlug),
        }),
        qc.prefetchQuery({ queryKey: ["editorialReviews"], queryFn: api.getEditorialReviews }),
      ]);
    } else if (normalized === "/privacy") {
      /* στατική σελίδα — χωρίς API */
    }
  } catch (err) {
    console.warn(`[ssrPrefetch] ${normalized}:`, err);
  }

  return dehydrate(qc);
}
