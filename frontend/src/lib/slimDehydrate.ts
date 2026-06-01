import type { QueryClient } from "@tanstack/react-query";
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
        moviePosterSrcSet: st.moviePosterSrcSet,
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
        gradientFrom: s.gradientFrom,
        gradientTo: s.gradientTo,
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

const HOME_SHOWTIME_HORIZON_MS = 14 * 24 * 60 * 60 * 1000;

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

/** Αρχική: μόνο ταινίες που εμφανίζονται στις προβολές + hero slug (όχι ολόκληρο catalog). */
export function trimMoviesForHomeBootstrap(qc: QueryClient): void {
  const movies = qc.getQueryData<StrapiMovie[]>(["movies"]);
  if (!movies?.length) return;
  const showtimes = qc.getQueryData<StrapiShowtime[]>(["showtimes"]);
  const homepage = qc.getQueryData<MappedHomepage>(["homepage"]);
  const keepIds = new Set<number>();
  const keepSlugs = new Set<string>();
  const heroSlug = homepage?.heroMovieSlug?.trim();
  if (heroSlug) keepSlugs.add(heroSlug);
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
  },
): void {
  slimListQueryCache(qc);
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
