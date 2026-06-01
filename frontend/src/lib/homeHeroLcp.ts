import type { DehydratedState } from "@tanstack/react-query";
import { layoutShowsHero, resolveHomepageLayout, type MappedHomepage } from "@/config/home";
import type { StrapiMovie } from "@/lib/api";
import { mostTalkedAboutMovies } from "@/lib/homeHeroPick";
import { posterLcpSrc } from "@/lib/posterDelivery";
import { lcpImageSrc } from "@/lib/lcpImageSrc";
import { resolvePublicAssetUrl } from "@/lib/siteMetadata";

function queryData<T>(state: DehydratedState, queryKey: string): T | undefined {
  const entry = state.queries.find(
    (q) => Array.isArray(q.queryKey) && q.queryKey.length === 1 && q.queryKey[0] === queryKey,
  );
  if (!entry || entry.state.status !== "success") return undefined;
  return entry.state.data as T;
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
  const hasHeroSection = layoutShowsHero(layout);

  const talked = mostTalkedAboutMovies(movies);
  const movie = talked[0] ?? movies.find((m) => m.posterUrl?.trim()) ?? null;

  let posterPath: string | null = null;
  let title = "";

  if (movie) {
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

  const absolute = resolvePublicAssetUrl(posterPath) ?? posterPath;
  const posterHref = lcpImageSrc(absolute);
  return { posterHref, title, hasHeroSection };
}

/** Preload hero — μόνο όταν υπάρχει CMS hero (αλλιώς το static LCP block). */
export function homeHeroPosterHref(path: string, dehydratedState?: DehydratedState): string | null {
  const lcp = homeLcpDisplay(path, dehydratedState);
  if (!lcp?.hasHeroSection) return null;
  return lcp.posterHref;
}
