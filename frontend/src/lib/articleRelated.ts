import type { StrapiArticle } from "@/lib/api";

export type ArticleRelatedKind = "movie" | "theater" | "event";

export type ArticleRelated = {
  kind: ArticleRelatedKind;
  title: string;
  slug: string;
  href?: string;
  sectionLabel: string;
};

/** Μία σχετική εγγραφή — προτεραιότητα: παράσταση → ταινία → (παλιό) event. */
export function resolveArticleRelated(article: StrapiArticle): ArticleRelated | undefined {
  const theater = article.relatedTheaterShow;
  if (theater?.title?.trim() && theater.slug?.trim()) {
    return {
      kind: "theater",
      title: theater.title.trim(),
      slug: theater.slug.trim(),
      href: `/theater/${theater.slug.trim()}`,
      sectionLabel: "Σχετική παράσταση",
    };
  }

  const movie = article.relatedMovie;
  if (movie?.title?.trim() && movie.slug?.trim()) {
    return {
      kind: "movie",
      title: movie.title.trim(),
      slug: movie.slug.trim(),
      href: `/movies/${movie.slug.trim()}`,
      sectionLabel: "Σχετική ταινία",
    };
  }

  const event = article.relatedEvent;
  if (event?.name?.trim()) {
    return {
      kind: "event",
      title: event.name.trim(),
      slug: event.slug?.trim() ?? "",
      sectionLabel: "Σχετική εκδήλωση",
    };
  }

  return undefined;
}
