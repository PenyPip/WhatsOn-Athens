import { api } from "@/lib/api";
import { buildMoviesListCrawlData, moviesListCrawlPathAllowed } from "@/lib/moviesListCrawlData";
import type { MoviesListCrawlSnapshot } from "@/lib/crawlTypes";

/** Crawlable λίστα ταινιών — live fetch (scripts / fallback). */
export async function fetchMoviesListCrawlSnapshot(path: string): Promise<MoviesListCrawlSnapshot | null> {
  if (!moviesListCrawlPathAllowed(path)) return null;
  const filters = path.match(/\/movies\/(new|soon|week)/);
  const needsCatalog = Boolean(filters);
  try {
    const [movies, showtimes, venues] = await Promise.all([
      needsCatalog ? api.getMovies() : api.getMoviesForHome(),
      api.getShowtimesForHome(),
      api.getVenuesForProgram(),
    ]);
    return buildMoviesListCrawlData(path, movies, showtimes, venues);
  } catch (err) {
    console.warn(`[moviesListCrawlSnapshot] ${path}:`, err);
    const { h1, intro } = buildMoviesListCrawlData(path, [], [], []);
    return { h1, intro, movies: [] };
  }
}
