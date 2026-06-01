import type { DehydratedState, QueryClient } from "@tanstack/react-query";
import type { MappedHomepage } from "@/config/home";
import type {
  StrapiMovie,
  StrapiMovieGenre,
  StrapiRestaurant,
  StrapiShowtime,
  StrapiTheaterShow,
  StrapiVenue,
} from "@/lib/api";
import { showtimeIsUpcoming } from "@/lib/homeMovieFilters";

function slimMoviesShowtimes(qc: QueryClient): void {
  const showtimes = qc.getQueryData<StrapiShowtime[]>(["showtimes"]);
  if (showtimes?.length) {
    qc.setQueryData(
      ["showtimes"],
      showtimes.map((st) => ({
        id: st.id,
        datetime: st.datetime,
        scheduleKind: st.scheduleKind,
        weekEnd: st.weekEnd,
        venueId: st.venueId,
        venueSlug: st.venueSlug,
        venue: st.venue,
        hallId: st.hallId,
        hallName: st.hallName,
        movieId: st.movieId,
        movieSlug: st.movieSlug,
        movieTitle: st.movieTitle,
        movieGenre: st.movieGenre,
        movieGenreSlugs: st.movieGenreSlugs,
        moviePosterUrl: st.moviePosterUrl,
        summerScreening: st.summerScreening,
        venueSummerOutdoor: st.venueSummerOutdoor,
        price: st.price,
        priceStudent: st.priceStudent,
      })),
    );
  }

  const movies = qc.getQueryData<StrapiMovie[]>(["movies"]);
  if (movies?.length) {
    qc.setQueryData(
      ["movies"],
      movies.map((m) => ({
        id: m.id,
        slug: m.slug,
        title: m.title,
        originalTitle: m.originalTitle,
        genre: m.genre,
        genreSlug: m.genreSlug,
        genreSlugs: m.genreSlugs,
        duration: m.duration,
        isDubbed: m.isDubbed,
        criticScore: m.criticScore,
        mostTalkedAbout: m.mostTalkedAbout,
        synopsis: m.mostTalkedAbout ? m.synopsis : undefined,
        director: m.mostTalkedAbout ? m.director : undefined,
        releaseDate: m.releaseDate,
        posterUrl: m.posterUrl,
        posterSrcSet: m.posterSrcSet,
      })),
    );
  }

  const theaterShows = qc.getQueryData<StrapiTheaterShow[]>(["theaterShows"]);
  if (theaterShows?.length) {
    qc.setQueryData(
      ["theaterShows"],
      theaterShows.map((s) => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        genre: s.genre,
        synopsis: s.synopsis,
        duration: s.duration,
        director: s.director,
        cast: s.cast,
        venue: s.venue,
        posterUrl: s.posterUrl,
        onTour: s.onTour,
        moreLink: s.moreLink,
      })),
    );
  }

  const restaurants = qc.getQueryData<StrapiRestaurant[]>(["restaurants"]);
  if (restaurants?.length) {
    qc.setQueryData(
      ["restaurants"],
      restaurants.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        cuisine: r.cuisine,
        neighborhood: r.neighborhood,
        city: r.city,
        priceRange: r.priceRange,
        isNew: r.isNew,
        posterUrl: r.posterUrl,
        gradientFrom: r.gradientFrom,
        gradientTo: r.gradientTo,
      })),
    );
  }

  const genres = qc.getQueryData<StrapiMovieGenre[]>(["movieGenres"]);
  if (genres?.length) {
    qc.setQueryData(
      ["movieGenres"],
      genres.map((g) => ({
        id: g.id,
        documentId: g.documentId,
        slug: g.slug,
        label: g.label,
        sortOrder: g.sortOrder,
      })),
    );
  }

  const venues = qc.getQueryData<StrapiVenue[]>(["venues"]);
  if (venues?.length) {
    qc.setQueryData(
      ["venues"],
      venues.map((v) => ({
        id: v.id,
        slug: v.slug,
        name: v.name,
        address: v.address,
        city: v.city,
        district: v.district,
        type: v.type,
        summerOutdoor: v.summerOutdoor,
        googleMapsUrl: v.googleMapsUrl,
        moreLink: v.moreLink,
        seatsTotal: v.seatsTotal,
        dayPrices: v.dayPrices,
      })),
    );
  }
}

/** Μικρότερο dehydrated state — αρχική + λίστα ταινιών (λιγότερο HTML). */
export function slimListQueryCache(qc: QueryClient): void {
  slimMoviesShowtimes(qc);
}

/** Bootstrap αρχικής: μόνο κοντινές προβολές (μικρότερο JSON.parse). */
const HOME_SHOWTIME_HORIZON_MS = 4 * 24 * 60 * 60 * 1000;

/** Μικρότερο `#__RQ_STATE__` — λιγότερο JSON.parse στην αρχική (TBT). */
export function minifyDehydratedState(state: DehydratedState): DehydratedState {
  return {
    mutations: state.mutations,
    queries: state.queries.map((q) => {
      const { dehydratedAt: _d, ...query } = q;
      const s = q.state;
      if (s.status === "success" && s.fetchStatus === "idle") {
        return {
          ...query,
          state: {
            data: s.data,
            status: "success",
            fetchStatus: "idle",
            dataUpdatedAt: s.dataUpdatedAt,
            error: null,
            fetchFailureCount: 0,
          },
        };
      }
      const { error: _e, errorUpdatedAt: _eu, fetchFailureCount: _f, ...restState } = s;
      return {
        ...query,
        state: {
          ...restState,
          error: null,
          fetchFailureCount: 0,
        },
      };
    }),
  } as DehydratedState;
}

function slimHomepageBootstrap(qc: QueryClient): void {
  const homepage = qc.getQueryData<MappedHomepage>(["homepage"]);
  if (!homepage) return;
  qc.setQueryData(["homepage"], {
    sections: homepage.sections,
  });
}

/** Λιγότερες εγγραφές showtimes στο bootstrap αρχικής (ταχύτερο JSON.parse). */
export function trimHomeShowtimesDehydrate(qc: QueryClient): void {
  const showtimes = qc.getQueryData<StrapiShowtime[]>(["showtimes"]);
  if (!showtimes?.length) return;
  const now = Date.now();
  const until = now + HOME_SHOWTIME_HORIZON_MS;
  qc.setQueryData(
    ["showtimes"],
    showtimes.filter((st) => {
      if (!showtimeIsUpcoming(st, new Date(now))) return false;
      const t = Date.parse(st.datetime);
      return !Number.isFinite(t) || t <= until;
    }),
  );
}

/** Μόνο προβολές μίας ταινίας στο bootstrap σελίδας λεπτομέρειας. */
export function trimShowtimesForMovieSlug(qc: QueryClient, movieSlug: string): void {
  const slug = movieSlug.trim();
  if (!slug) return;
  const showtimes = qc.getQueryData<StrapiShowtime[]>(["showtimes"]);
  if (!showtimes?.length) return;
  qc.setQueryData(
    ["showtimes"],
    showtimes.filter((st) => st.movieSlug === slug),
  );
}

/** Αρχική: μόνο ταινίες που εμφανίζονται στις προβολές + πολυσυζητημένες (όχι ολόκληρο catalog). */
export function trimMoviesForHomeBootstrap(qc: QueryClient): void {
  const movies = qc.getQueryData<StrapiMovie[]>(["movies"]);
  if (!movies?.length) return;
  const showtimes = qc.getQueryData<StrapiShowtime[]>(["showtimes"]);
  const keepIds = new Set<number>();
  const keepSlugs = new Set<string>();
  for (const m of movies) {
    if (m.mostTalkedAbout) {
      keepIds.add(m.id);
      if (m.slug?.trim()) keepSlugs.add(m.slug.trim());
    }
  }
  for (const st of showtimes ?? []) {
    if (st.movieId != null) keepIds.add(Number(st.movieId));
    const slug = typeof st.movieSlug === "string" ? st.movieSlug.trim() : "";
    if (slug) keepSlugs.add(slug);
  }
  if (keepIds.size === 0 && keepSlugs.size === 0) return;
  qc.setQueryData(
    ["movies"],
    movies.filter((m) => keepIds.has(m.id) || keepSlugs.has(m.slug)),
  );
}

/** Μόνο venues που εμφανίζονται στις τρέχουσες προβολές. */
export function trimVenuesForShowtimes(qc: QueryClient): void {
  const showtimes = qc.getQueryData<StrapiShowtime[]>(["showtimes"]);
  const venues = qc.getQueryData<StrapiVenue[]>(["venues"]);
  if (!showtimes?.length || !venues?.length) return;
  const venueIds = new Set<number>();
  const venueSlugs = new Set<string>();
  const venueNames = new Set<string>();
  for (const st of showtimes) {
    if (st.venueId != null) venueIds.add(Number(st.venueId));
    if (st.venueSlug) venueSlugs.add(st.venueSlug);
    if (typeof st.venue === "string" && st.venue.trim()) venueNames.add(st.venue.trim());
  }
  qc.setQueryData(
    ["venues"],
    venues.filter(
      (v) =>
        venueIds.has(v.id) ||
        venueSlugs.has(v.slug) ||
        venueNames.has(v.name.trim()),
    ),
  );
}

/** Τελικό slim + trim για κάθε static export route. */
export function finalizeBootstrapCache(
  qc: QueryClient,
  options?: {
    movieSlug?: string;
    trimHomeShowtimes?: boolean;
    trimHomeMovies?: boolean;
    trimVenuesForShowtimes?: boolean;
    slimHomepage?: boolean;
  },
): void {
  slimListQueryCache(qc);
  if (options?.slimHomepage) slimHomepageBootstrap(qc);
  if (options?.trimHomeShowtimes) trimHomeShowtimesDehydrate(qc);
  if (options?.trimHomeMovies) trimMoviesForHomeBootstrap(qc);
  if (options?.trimVenuesForShowtimes) trimVenuesForShowtimes(qc);
  if (options?.movieSlug) {
    trimShowtimesForMovieSlug(qc, options.movieSlug);
    trimVenuesForShowtimes(qc);
  }
}

/** @deprecated Use slimListQueryCache */
export const slimHomeQueryCache = slimListQueryCache;
