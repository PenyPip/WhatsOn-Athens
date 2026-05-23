import type { QueryClient } from "@tanstack/react-query";
import type { StrapiMovie, StrapiMovieGenre, StrapiRestaurant, StrapiShowtime, StrapiVenue } from "@/lib/api";

function slimMoviesShowtimes(qc: QueryClient): void {
  const showtimes = qc.getQueryData<StrapiShowtime[]>(["showtimes"]);
  if (showtimes?.length) {
    qc.setQueryData(
      ["showtimes"],
      showtimes.map((st) => ({
        id: st.id,
        datetime: st.datetime,
        venueId: st.venueId,
        venueSlug: st.venueSlug,
        venue: st.venue,
        movieId: st.movieId,
        movieSlug: st.movieSlug,
        movieTitle: st.movieTitle,
        movieGenre: st.movieGenre,
        movieGenreSlugs: st.movieGenreSlugs,
        summerScreening: st.summerScreening,
        venueSummerOutdoor: st.venueSummerOutdoor,
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
        releaseDate: m.releaseDate,
        posterUrl: m.posterUrl,
        posterSrcSet: m.posterSrcSet,
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
        type: v.type,
        summerOutdoor: v.summerOutdoor,
        googleMapsUrl: v.googleMapsUrl,
        moreLink: v.moreLink,
        seatsTotal: v.seatsTotal,
      })),
    );
  }
}

/** Μικρότερο dehydrated state — αρχική + λίστα ταινιών (λιγότερο HTML). */
export function slimListQueryCache(qc: QueryClient): void {
  slimMoviesShowtimes(qc);
}

/** @deprecated Use slimListQueryCache */
export const slimHomeQueryCache = slimListQueryCache;
