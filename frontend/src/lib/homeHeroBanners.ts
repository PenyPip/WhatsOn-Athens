import type { StrapiEvent, StrapiMovie, StrapiShowtime, StrapiTheaterShow } from "@/lib/api";
import { eventPath } from "@/lib/eventLabels";
import { heroMovieCta, resolveHeroScheduleDisplay } from "@/lib/heroScheduleLine";
import { movieTitleLines, posterAltForMovie } from "@/lib/movieTitles";
import { synopsisExcerpt } from "@/lib/synopsisExcerpt";

const HERO_SYNOPSIS_MAX = 280;

/** Mapped CMS banner από Homepage.hero_banners. */
export type MappedHomeHeroBanner = {
  id: string;
  title: string;
  description: string;
  movie?: Pick<StrapiMovie, "id" | "slug" | "title" | "originalTitle" | "posterUrl" | "posterSrcSet" | "genre" | "director" | "synopsis" | "releaseDate">;
  theaterShow?: Pick<StrapiTheaterShow, "id" | "slug" | "title" | "posterUrl" | "genre" | "director" | "synopsis">;
  event?: Pick<StrapiEvent, "id" | "slug" | "titleEl" | "posterUrl" | "posterSrcSet" | "synopsisEl">;
};

export type HomeHeroSlide = {
  key: string;
  title: string;
  secondaryTitle?: string;
  description: string;
  href: string;
  ctaLabel: string;
  posterUrl?: string;
  posterSrcSet?: string;
  posterAlt: string;
  /** Badge πάνω από τον τίτλο· κενό = χωρίς badge. */
  eyebrow?: string;
  genre?: string;
  meta?: string;
  scheduleLabel?: string;
  /** Overlay IMDb κ.λπ. μόνο για ταινίες. */
  movieMeta?: StrapiMovie;
};

function bannerRelated(
  banner: MappedHomeHeroBanner,
):
  | { kind: "movie"; movie: NonNullable<MappedHomeHeroBanner["movie"]> }
  | { kind: "theater"; show: NonNullable<MappedHomeHeroBanner["theaterShow"]> }
  | { kind: "event"; event: NonNullable<MappedHomeHeroBanner["event"]> }
  | null {
  if (banner.movie?.slug?.trim()) return { kind: "movie", movie: banner.movie };
  if (banner.theaterShow?.slug?.trim()) return { kind: "theater", show: banner.theaterShow };
  if (banner.event?.slug?.trim()) return { kind: "event", event: banner.event };
  return null;
}

/** Banners με έγκυρο συσχετιζόμενο περιεχόμενο (slug + τουλάχιστον τίτλος banner). */
export function resolveHomeHeroBanners(banners: MappedHomeHeroBanner[] | undefined): MappedHomeHeroBanner[] {
  if (!banners?.length) return [];
  return banners.filter((b) => b.title.trim() && bannerRelated(b));
}

export function homeHeroSlidesFromBanners(banners: MappedHomeHeroBanner[]): HomeHeroSlide[] {
  const out: HomeHeroSlide[] = [];
  for (const banner of banners) {
    const related = bannerRelated(banner);
    if (!related) continue;
    const title = banner.title.trim();
    const bannerDesc = banner.description.trim();
    const relatedSynopsis = fallbackDescription(related);
    /** Σύντομο teaser CMS + σύνοψη related → πιο γεμάτο κείμενο στο hero. */
    const richDescription = synopsisExcerpt(
      bannerDesc && relatedSynopsis && bannerDesc.length < 120 && !relatedSynopsis.startsWith(bannerDesc)
        ? `${bannerDesc} ${relatedSynopsis}`
        : bannerDesc || relatedSynopsis,
      HERO_SYNOPSIS_MAX,
    );

    if (related.kind === "movie") {
      const m = related.movie;
      const titles = movieTitleLines({ title: m.title, originalTitle: m.originalTitle } as StrapiMovie);
      const relatedPrimary = titles.primary.trim();
      out.push({
        key: `banner-${banner.id}`,
        title,
        secondaryTitle:
          relatedPrimary && relatedPrimary.toLocaleLowerCase("el") !== title.toLocaleLowerCase("el")
            ? relatedPrimary
            : titles.secondary || undefined,
        description: richDescription,
        href: heroMovieCta(m.slug).to,
        ctaLabel: "Περισσότερα",
        posterUrl: m.posterUrl ?? undefined,
        posterSrcSet: m.posterSrcSet,
        posterAlt: posterAltForMovie(m as StrapiMovie),
        eyebrow: "Προτεινόμενο",
        genre: (m.genre ?? "").trim() || undefined,
        meta: directorMeta(m.director),
        movieMeta: m as StrapiMovie,
      });
      continue;
    }

    if (related.kind === "theater") {
      const s = related.show;
      const relatedPrimary = s.title.trim();
      out.push({
        key: `banner-${banner.id}`,
        title,
        secondaryTitle:
          relatedPrimary && relatedPrimary.toLocaleLowerCase("el") !== title.toLocaleLowerCase("el")
            ? relatedPrimary
            : undefined,
        description: richDescription,
        href: `/theater/${encodeURIComponent(s.slug)}`,
        ctaLabel: "Περισσότερα",
        posterUrl: s.posterUrl,
        posterAlt: s.title,
        eyebrow: "Προτεινόμενο",
        genre: (s.genre ?? "").trim() || undefined,
        meta: directorMeta(s.director),
      });
      continue;
    }

    const e = related.event;
    const relatedPrimary = (e.titleEl ?? "").trim();
    out.push({
      key: `banner-${banner.id}`,
      title,
      secondaryTitle:
        relatedPrimary && relatedPrimary.toLocaleLowerCase("el") !== title.toLocaleLowerCase("el")
          ? relatedPrimary
          : undefined,
      description: richDescription,
      href: eventPath(e.slug),
      ctaLabel: "Περισσότερα",
      posterUrl: e.posterUrl,
      posterSrcSet: e.posterSrcSet,
      posterAlt: e.titleEl || title,
      eyebrow: "Προτεινόμενο",
    });
  }
  return out;
}

function fallbackDescription(
  related:
    | { kind: "movie"; movie: NonNullable<MappedHomeHeroBanner["movie"]> }
    | { kind: "theater"; show: NonNullable<MappedHomeHeroBanner["theaterShow"]> }
    | { kind: "event"; event: NonNullable<MappedHomeHeroBanner["event"]> },
): string {
  if (related.kind === "movie") return related.movie.synopsis ?? "";
  if (related.kind === "theater") return related.show.synopsis ?? "";
  return related.event.synopsisEl ?? "";
}

function directorMeta(director: string | undefined): string | undefined {
  const d = (director ?? "").trim();
  if (!d || d === "-") return undefined;
  return `Σκηνοθεσία: ${d}`;
}

/** Fallback: πολυσυζητημένες ταινίες → slides ίδιας μορφής. */
export function homeHeroSlidesFromMovies(
  movies: StrapiMovie[],
  showtimes: StrapiShowtime[] = [],
  now = new Date(),
): HomeHeroSlide[] {
  return movies.map((movie) => {
    const titles = movieTitleLines(movie);
    const schedule = resolveHeroScheduleDisplay(movie, showtimes, now);
    const cta = heroMovieCta(movie.slug);
    return {
      key: `movie-${movie.id}`,
      title: titles.primary,
      secondaryTitle: titles.secondary || undefined,
      description: synopsisExcerpt(movie.synopsis ?? "", HERO_SYNOPSIS_MAX),
      href: cta.to,
      ctaLabel: cta.label,
      posterUrl: movie.posterUrl ?? undefined,
      posterSrcSet: movie.posterSrcSet,
      posterAlt: posterAltForMovie(movie),
      eyebrow: "Πολυσυζητημένες",
      genre: (movie.genre ?? "").trim() || undefined,
      meta: directorMeta(movie.director),
      scheduleLabel: schedule.mode === "release" ? schedule.label : undefined,
      movieMeta: movie,
    };
  });
}
