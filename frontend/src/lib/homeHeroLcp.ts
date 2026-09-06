import type { DehydratedState } from "@tanstack/react-query";
import { layoutShowsHero, resolveHomepageLayout, type MappedHomepage } from "@/config/home";
import type { StrapiMovie } from "@/lib/api";
import { mostTalkedAboutMovies } from "@/lib/homeHeroPick";
import {
  homeHeroSlidesFromBanners,
  homeHeroSlidesFromMovies,
  resolveHomeHeroBanners,
} from "@/lib/homeHeroBanners";
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
  synopsis: string;
  /** CMS ενότητα hero - το SPA σχεδιάζει το πλήρες hero. */
  hasHeroSection: boolean;
};

/** LCP αφίσα + τίτλος για `/` (με ή χωρίς CMS hero). */
export function homeLcpDisplay(path: string, dehydratedState?: DehydratedState): HomeLcpDisplay | null {
  if (path !== "/" || !dehydratedState) return null;

  const layout = resolveHomepageLayout(queryData<MappedHomepage>(dehydratedState, "homepage") ?? null);
  const movies = queryData<StrapiMovie[]>(dehydratedState, "movies") ?? [];
  const hasHeroSection = layoutShowsHero(layout);

  const bannerSlides = homeHeroSlidesFromBanners(resolveHomeHeroBanners(layout.heroBanners));
  const talked = mostTalkedAboutMovies(movies);
  const movieSlides = homeHeroSlidesFromMovies(talked);
  const slide = bannerSlides[0] ?? movieSlides[0] ?? null;

  let posterPath: string | null = null;
  let title = "";
  let synopsis = "";

  if (slide) {
    const href = posterLcpSrc(slide.posterUrl, slide.posterSrcSet) ?? slide.posterUrl?.trim();
    if (href) posterPath = href;
    title = slide.title;
    synopsis = slide.description;
  }

  if (!posterPath) {
    const fallbackMovie =
      talked.find((m) => m.posterUrl?.trim()) ?? movies.find((m) => m.posterUrl?.trim()) ?? null;
    if (fallbackMovie) {
      posterPath =
        posterLcpSrc(fallbackMovie.posterUrl, fallbackMovie.posterSrcSet) ??
        fallbackMovie.posterUrl!.trim();
      if (!title) title = fallbackMovie.title;
      if (!synopsis) synopsis = fallbackMovie.synopsis ?? "";
    }
  }

  if (!posterPath) return null;

  const absolute = resolvePublicAssetUrl(posterPath) ?? posterPath;
  const posterHref = lcpImageSrc(absolute);
  return { posterHref, title, synopsis, hasHeroSection };
}
