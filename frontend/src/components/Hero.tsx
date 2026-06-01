import { Link } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { layoutShowsHero, type ResolvedHomepageLayout } from "@/config/home";
import type { StrapiMovie, StrapiShowtime, StrapiTheaterShow } from "@/lib/api";
import { movieTitleLines, posterAltForMovie, posterAltForTheater } from "@/lib/movieTitles";
import { enrichMoviesWithShowtimeGenre } from "@/lib/homeMovieFilters";
import { resolveHeroPicks } from "@/lib/homeHeroPick";
import PosterPicture from "@/components/PosterPicture";
import { posterLcpSrc } from "@/lib/posterDelivery";
import { HOME_HERO_SECTION_CLASS } from "@/lib/homeHeroLayout";

export const HERO_SECTION_CLASS = HOME_HERO_SECTION_CLASS;

/** Κράτα ύψος hero — ίδιο DOM σε SSR, pre-hydrate και loading (αποφυγή hydration mismatch). */
export function HeroShell() {
  return (
    <section className={HERO_SECTION_CLASS} aria-hidden="true">
      <div className="absolute inset-0 bg-[#13143E]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/40 to-transparent" />
      <div className="relative z-10 container flex h-full items-end pb-16 md:pb-20">
        <div className="max-w-2xl w-full space-y-4 pb-2">
          <div className="h-3 w-48 rounded bg-white/10" />
          <div className="h-12 w-4/5 max-w-md rounded bg-white/10 md:h-16" />
          <div className="h-4 w-full max-w-lg rounded bg-white/10" />
          <div className="h-4 w-5/6 max-w-md rounded bg-white/10" />
          <div className="h-10 w-36 rounded bg-white/15" />
        </div>
      </div>
    </section>
  );
}

type HeroProps = {
  layout: ResolvedHomepageLayout;
  movies: StrapiMovie[];
  showtimes: StrapiShowtime[];
  theaterShows: StrapiTheaterShow[];
  /** Κρύβει το static LCP overlay αφού φορτώσει η αφίσα (αποφυγή LCP regression). */
  onPosterReady?: () => void;
};

const Hero = ({ layout, movies, showtimes, theaterShows, onPosterReady }: HeroProps) => {
  const moviesEnriched = useMemo(
    () => enrichMoviesWithShowtimeGenre(movies, showtimes),
    [movies, showtimes],
  );

  const moviesForPick = moviesEnriched.length ? moviesEnriched : movies;

  const picks = useMemo(() => {
    if (!layoutShowsHero(layout)) {
      return { theater: null as StrapiTheaterShow | null, movie: null as StrapiMovie | null };
    }
    return resolveHeroPicks(layout, moviesForPick, theaterShows);
  }, [layout, moviesForPick, theaterShows]);

  const featured = picks.theater ?? picks.movie;
  const isTheater = Boolean(picks.theater);
  const showsHero = layoutShowsHero(layout);
  const hasPosterImg = featured
    ? isTheater
      ? Boolean(picks.theater?.posterUrl)
      : Boolean(picks.movie?.posterUrl)
    : false;

  useEffect(() => {
    if (!showsHero || !featured || hasPosterImg) return;
    onPosterReady?.();
  }, [showsHero, featured, hasPosterImg, onPosterReady]);

  if (!showsHero) return null;
  if (!featured) {
    return <HeroShell />;
  }

  const notifyPosterReady = () => onPosterReady?.();
  const movieTitles = !isTheater ? movieTitleLines(featured as StrapiMovie) : null;

  let heroGenreLabel = "";
  if (isTheater) {
    const t = featured;
    heroGenreLabel = (t.genre ?? "").trim();
    if (
      !heroGenreLabel &&
      layout.heroTheaterSlug &&
      t.slug === layout.heroTheaterSlug &&
      (layout.priorityTheaterGenre ?? "").trim()
    ) {
      heroGenreLabel = layout.priorityTheaterGenre!.trim();
    }
  } else {
    const m = featured;
    heroGenreLabel = (m.genre ?? "").trim();
    if (
      !heroGenreLabel &&
      layout.heroMovieSlug &&
      m.slug === layout.heroMovieSlug &&
      (layout.priorityMovieGenre ?? "").trim()
    ) {
      heroGenreLabel = layout.priorityMovieGenre!.trim();
    }
  }

  const to = isTheater ? `/theater/${featured.slug}` : `/movies/${featured.slug}`;
  const eyebrow = isTheater ? "Καλοκαίρι · παραστάσεις που ταξιδεύουν" : "Καλοκαίρι · θερινά σινεμά & θέατρο που ταξιδεύει";
  const kicker = isTheater
    ? "Προτεινόμενη παράσταση"
    : picks.movie?.mostTalkedAbout
      ? "Πολυσυζητημένη"
      : "Προτεινόμενη ταινία";

  return (
    <section className={HERO_SECTION_CLASS}>
      <div className="absolute inset-0">
        {!isTheater && picks.movie?.posterUrl ? (
          <>
            <PosterPicture
              src={posterLcpSrc(picks.movie.posterUrl, picks.movie.posterSrcSet) ?? picks.movie.posterUrl}
              srcSet={picks.movie.posterSrcSet}
              alt={posterAltForMovie(picks.movie)}
              width={640}
              height={960}
              fetchPriority="high"
              loading="eager"
              sizes="(max-width: 768px) 100vw, 800px"
              className="h-full w-full object-cover opacity-55"
              onLoad={notifyPosterReady}
            />
          </>
        ) : isTheater && picks.theater?.posterUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={picks.theater.posterUrl}
              alt={posterAltForTheater(picks.theater.title)}
              width={1200}
              height={1800}
              fetchPriority="high"
              loading="eager"
              decoding="async"
              sizes="100vw"
              className="h-full w-full object-cover opacity-55"
              onLoad={notifyPosterReady}
            />
          </>
        ) : isTheater ? (
          <div
            className="h-full w-full opacity-40"
            style={{
              background: `linear-gradient(135deg, ${picks.theater!.gradientFrom}, ${picks.theater!.gradientTo})`,
            }}
          />
        ) : (
          <div className="h-full w-full bg-[#13143E]" />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/40 to-transparent" />

      <div className="relative z-10 container flex h-full items-end pb-16 md:pb-20">
        <div className="max-w-2xl">
          <span className="mb-3 block font-body text-[10px] uppercase tracking-[0.28em] text-amber-200/90 md:text-[11px]">{eyebrow}</span>
          {(heroGenreLabel ?? "").trim() ? (
            <span className="mb-2 inline-flex rounded border border-white/15 bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/95">
              Είδος · {heroGenreLabel}
            </span>
          ) : null}
          <span className="mb-2 block text-xs font-body uppercase tracking-[0.2em] text-white/70">{kicker}</span>
          <div className="mb-5 h-0.5 w-16 bg-amber-400/85" />
          <h2 className="font-display mb-2 text-4xl font-bold leading-tight text-white md:text-6xl">
            {isTheater ? featured.title : movieTitles!.primary}
          </h2>
          {!isTheater && movieTitles?.secondary ? (
            <p className="font-display mb-4 text-2xl font-medium leading-tight text-white/90 md:text-4xl">{movieTitles.secondary}</p>
          ) : null}
          <p className="mb-6 max-w-lg font-body text-base leading-relaxed text-white/75 md:text-lg">{featured.synopsis}</p>
          <div className="flex items-center gap-4">
            <Link
              to={to}
              className="inline-flex items-center rounded bg-white px-6 py-3 text-sm font-semibold text-[#111111] transition-colors hover:bg-white/90"
            >
              Δες λεπτομέρειες
            </Link>
            <span className="text-sm text-white/60">{featured.duration}&apos;</span>
          </div>
          <p className="mt-6 font-body text-xs text-white/55">
            Σκηνοθεσία: {featured.director} · {featured.cast?.slice(0, 3).join(", ")}
            {isTheater ? ` · ${picks.theater!.venue}` : ""}
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
