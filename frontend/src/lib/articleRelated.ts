import type { StrapiArticle } from "@/lib/api";
import { eventDisplayTitle, eventPath } from "@/lib/eventLabels";

export type ArticleRelatedKind = "movie" | "theater" | "event";

export type ArticleRelated = {
  kind: ArticleRelatedKind;
  title: string;
  slug: string;
  href?: string;
  sectionLabel: string;
};

/** Σύντομο link ταινίας/παράστασης (όχι Event — αυτό έχει ξεχωριστό panel). */
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

  return undefined;
}

/** Για λίστα άρθρων — τίτλος σχετικής εκδήλωσης αν υπάρχει. */
export function resolveArticleRelatedListLabel(article: StrapiArticle): string | undefined {
  const theater = article.relatedTheaterShow?.title?.trim();
  if (theater) return theater;
  const movie = article.relatedMovie?.title?.trim();
  if (movie) return movie;
  const ev = article.relatedEvent;
  if (ev) {
    const fallback =
      ev.slug?.trim() && ev.slug.trim() === article.slug?.trim() ? article.title : undefined;
    const eventTitle = eventDisplayTitle(ev, { fallbackTitle: fallback });
    if (eventTitle) return eventTitle;
  }
  return undefined;
}

export function resolveArticleRelatedEventHref(article: StrapiArticle): string | undefined {
  const slug = article.relatedEvent?.slug?.trim();
  return slug ? eventPath(slug) : undefined;
}
