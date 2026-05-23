import type { QueryClient } from "@tanstack/react-query";
import type { StrapiMovie, StrapiRestaurant, StrapiShowtime } from "@/lib/api";

/** Μικρότερο dehydrated state — λιγότερο HTML/JS payload στην αρχική. */
export function slimHomeQueryCache(qc: QueryClient): void {
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
}
