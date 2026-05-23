import type { DehydratedState } from "@tanstack/react-query";
import { layoutShowsHero, resolveHomepageLayout, type MappedHomepage } from "@/config/home";
import type { StrapiMovie, StrapiTheaterShow } from "@/lib/api";
import { posterLcpSrc } from "@/lib/posterDelivery";
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

function resolveFeatured(
  layout: ReturnType<typeof resolveHomepageLayout>,
  movies: StrapiMovie[],
  theaterShows: StrapiTheaterShow[],
): { theater: StrapiTheaterShow | null; movie: StrapiMovie | null } {
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

  return { theater, movie };
}

export type HomeLcpDisplay = {
  posterHref: string;
  title: string;
  /** CMS ενότητα hero — το SPA σχεδιάζει το πλήρες hero. */
  hasHeroSection: boolean;
};

/** LCP αφίσα + τίτλος για `/` (με ή χωρίς CMS hero). */
export function homeLcpDisplay(path: string, dehydratedState?: DehydratedState): HomeLcpDisplay | null {
  if (path !== "/" || !dehydratedState) return null;

  const layout = resolveHomepageLayout(queryData<MappedHomepage>(dehydratedState, "homepage") ?? null);
  const movies = queryData<StrapiMovie[]>(dehydratedState, "movies") ?? [];
  const theaterShows = queryData<StrapiTheaterShow[]>(dehydratedState, "theaterShows") ?? [];
  const hasHeroSection = layoutShowsHero(layout);

  const { theater, movie } = resolveFeatured(layout, movies, theaterShows);
  const featured = theater ?? movie;

  let posterPath: string | null = null;
  let title = "";

  if (theater?.posterUrl?.trim()) {
    posterPath = theater.posterUrl.trim();
    title = theater.title;
  } else if (movie) {
    const href = posterLcpSrc(movie.posterUrl, movie.posterSrcSet) ?? movie.posterUrl?.trim();
    if (href) posterPath = href;
    title = movie.title;
  }

  if (!posterPath && !hasHeroSection) {
    const fallback = movies.find((m) => m.posterUrl?.trim());
    if (fallback) {
      posterPath = posterLcpSrc(fallback.posterUrl, fallback.posterSrcSet) ?? fallback.posterUrl!.trim();
      title = fallback.title;
    }
  }

  if (!posterPath) return null;

  const posterHref = resolvePublicAssetUrl(posterPath) ?? posterPath;
  return { posterHref, title, hasHeroSection };
}

/** Preload hero — μόνο όταν υπάρχει CMS hero (αλλιώς το static LCP block). */
export function homeHeroPosterHref(path: string, dehydratedState?: DehydratedState): string | null {
  const lcp = homeLcpDisplay(path, dehydratedState);
  if (!lcp?.hasHeroSection) return null;
  return lcp.posterHref;
}
