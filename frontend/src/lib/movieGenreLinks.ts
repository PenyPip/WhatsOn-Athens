import type { StrapiMovie, StrapiMovieGenre } from "@/lib/api";
import { slugToDisplayName } from "@/lib/jsonLdPage";

export type GenreLinkItem = { slug: string; label: string };

/** Σύνδεσμοι προς `/movies?genre=slug` από slugs ταινίας + κατάλογο CMS. */
export function movieGenreLinkItems(
  movie: StrapiMovie | null | undefined,
  genresList: StrapiMovieGenre[] | undefined,
): GenreLinkItem[] {
  if (!movie) return [];
  const slugs = [...(movie.genreSlugs ?? [])];
  if (!slugs.length && movie.genreSlug?.trim()) slugs.push(movie.genreSlug.trim());
  const unique = [...new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
  if (!unique.length) return [];

  const labelBySlug = new Map(
    (genresList ?? []).map((g) => [g.slug.trim().toLowerCase(), g.label.trim() || g.slug] as const),
  );

  return unique.map((slug) => ({
    slug,
    label: labelBySlug.get(slug) ?? slugToDisplayName(slug),
  }));
}

export function moviesGenreHref(slug: string): string {
  return `/movies?genre=${encodeURIComponent(slug.trim().toLowerCase())}`;
}
