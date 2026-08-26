import type { DehydratedState } from "@tanstack/react-query";
import type { StrapiMovie, StrapiTheaterShow } from "@/lib/api";
import { lcpImageSrc } from "@/lib/lcpImageSrc";
import { posterLcpSrc } from "@/lib/posterDelivery";

/** Preload αφίσας για `/movies/:slug` ή `/theater/:slug` από RQ bootstrap (LCP). */
export function detailPosterPreloadHref(
  path: string,
  state: DehydratedState | undefined,
): string | null {
  if (!state) return null;

  const movieMatch = path.match(/^\/movies\/([^/]+)$/);
  if (movieMatch) {
    const slug = decodeURIComponent(movieMatch[1]);
    const entry = state.queries.find(
      (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === "movie" &&
        q.queryKey[1] === slug &&
        q.state.status === "success",
    );
    const movie = entry?.state.data as StrapiMovie | undefined;
    if (!movie) return null;
    const href = posterLcpSrc(movie.posterUrl, movie.posterSrcSet) ?? movie.posterUrl?.trim();
    return href ? lcpImageSrc(href) : null;
  }

  const theaterMatch = path.match(/^\/theater\/([^/]+)$/);
  if (theaterMatch) {
    const slug = decodeURIComponent(theaterMatch[1]);
    const shows = state.queries.find(
      (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === "theaterShows" &&
        q.state.status === "success",
    )?.state.data as StrapiTheaterShow[] | undefined;
    const show = shows?.find((s) => s.slug === slug);
    const href = show?.posterUrl?.trim();
    return href ? lcpImageSrc(href) : null;
  }

  return null;
}
