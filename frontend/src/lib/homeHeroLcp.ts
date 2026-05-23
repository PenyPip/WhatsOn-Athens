import type { DehydratedState } from "@tanstack/react-query";
import { layoutShowsHero, resolveHomepageLayout, type MappedHomepage } from "@/config/home";
import type { StrapiMovie, StrapiTheaterShow } from "@/lib/api";
import { resolvePublicAssetUrl } from "@/lib/siteMetadata";

function clampIndex(n: number, length: number): number {
  if (length <= 0) return 0;
  if (Number.isNaN(n)) return Math.min(2, Math.max(0, length - 1));
  return Math.max(0, Math.min(length - 1, n));
}

function queryData<T>(state: DehydratedState, queryKey: string): T | undefined {
  const entry = state.queries.find(
    (q) => Array.isArray(q.queryKey) && q.queryKey.length === 1 && q.queryKey[0] === queryKey,
  );
  if (!entry || entry.state.status !== "success") return undefined;
  return entry.state.data as T;
}

/** Ίδια λογική με `Hero` — URL αφίσας για LCP preload στην αρχική. */
export function homeHeroPosterHref(path: string, dehydratedState?: DehydratedState): string | null {
  if (path !== "/" || !dehydratedState) return null;

  const layout = resolveHomepageLayout(queryData<MappedHomepage>(dehydratedState, "homepage") ?? null);
  if (!layoutShowsHero(layout)) return null;

  const movies = queryData<StrapiMovie[]>(dehydratedState, "movies") ?? [];
  const theaterShows = queryData<StrapiTheaterShow[]>(dehydratedState, "theaterShows") ?? [];

  const theaterSlug = layout.heroTheaterSlug ?? undefined;
  const movieSlug = layout.heroMovieSlug ?? undefined;

  let theater: StrapiTheaterShow | null = null;
  let movie: StrapiMovie | null = null;

  if (theaterSlug) {
    theater = theaterShows.find((s) => s.slug === theaterSlug) ?? null;
  }
  if (!theater && movieSlug) {
    movie = movies.find((m) => m.slug === movieSlug) ?? null;
  }
  if (!theater && !movie && movies.length) {
    const idx = clampIndex(layout.featuredMovieIndex, movies.length);
    movie = movies[idx] ?? movies[0] ?? null;
  }

  const featured = theater ?? movie;
  if (!featured) return null;

  const posterPath = theater
    ? (featured as StrapiTheaterShow).posterUrl
    : (featured as StrapiMovie).posterUrl;

  if (!posterPath?.trim()) return null;
  return resolvePublicAssetUrl(posterPath) ?? null;
}
