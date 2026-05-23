import { Link } from "react-router-dom";
import { useMemo } from "react";
import { layoutShowsHero, type ResolvedHomepageLayout } from "@/config/home";
import type { StrapiMovie, StrapiShowtime, StrapiTheaterShow } from "@/lib/api";
import { movieTitleLines, posterAltForMovie, posterAltForTheater } from "@/lib/movieTitles";
import { enrichMoviesWithShowtimeGenre } from "@/lib/homeMovieFilters";
import { posterLcpSrc } from "@/lib/posterDelivery";

const HERO_SECTION_CLASS =
  "relative h-[75vh] min-h-[500px] overflow-hidden bg-[#111111] max-md:-mt-16 max-md:pt-16 md:-mt-28 md:pt-28";

function clampIndex(n: number, length: number): number {
  if (length <= 0) return 0;
  if (Number.isNaN(n)) return Math.min(2, Math.max(0, length - 1));
  return Math.max(0, Math.min(length - 1, n));
}

function HeroSkeleton() {
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
};

const Hero = ({ layout, movies, showtimes, theaterShows }: HeroProps) => {
  const moviesEnriched = useMemo(
    () => enrichMoviesWithShowtimeGenre(movies, showtimes),
    [movies, showtimes],
  );

  const moviesForPick = moviesEnriched.length ? moviesEnriched : movies;

  if (!layoutShowsHero(layout)) return null;

  const theaterSlug = layout.heroTheaterSlug ?? undefined;
  const movieSlug = layout.heroMovieSlug ?? undefined;

  let theater: StrapiTheaterShow | null = null;
  let movie: StrapiMovie | null = null;

  if (theaterSlug) {
    theater = theaterShows.find((s) => s.slug === theaterSlug) ?? null;
  }
  if (!theater && movieSlug) {
    movie = moviesForPick.find((m) => m.slug === movieSlug) ?? null;
  }
  if (!theater && !movie && moviesForPick.length) {
    const idx = clampIndex(layout.featuredMovieIndex, moviesForPick.length);
    movie = moviesForPick[idx] ?? moviesForPick[0] ?? null;
  }

  const featured = theater ?? movie;
  if (!featured) {
    if (movies.length === 0 && theaterShows.length === 0) return <HeroSkeleton />;
    return null;
  }

  const isTheater = Boolean(theater);
  const movieTitles = !isTheater ? movieTitleLines(featured as StrapiMovie) : null;

  let heroGenreLabel = "";
  if (isTheater) {
    const t = featured as StrapiTheaterShow;
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
    const m = featured as StrapiMovie;
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

  const to = isTheater ? `/theater/${(featured as StrapiTheaterShow).slug}` : `/movies/${(featured as StrapiMovie).slug}`;
  const eyebrow = isTheater ? "Καλοκαίρι · παραστάσεις που ταξιδεύουν" : "Καλοκαίρι · θερινά σινεμά & θέατρο που ταξιδεύει";
  const kicker = isTheater ? "Προτεινόμενη παράσταση" : "Προτεινόμενη ταινία";

  return (
    <section className={HERO_SECTION_CLASS}>
      <div className="absolute inset-0">
        {!isTheater && (featured as StrapiMovie).posterUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- hero poster Strapi, static export */}
            <img
              src={
                posterLcpSrc((featured as StrapiMovie).posterUrl, (featured as StrapiMovie).posterSrcSet) ??
                (featured as StrapiMovie).posterUrl
              }
              srcSet={(featured as StrapiMovie).posterSrcSet}
              alt={posterAltForMovie(featured as StrapiMovie)}
              width={640}
              height={960}
              fetchPriority="high"
              decoding="async"
              sizes="(max-width: 768px) 100vw, 800px"
              className="h-full w-full object-cover opacity-55"
            />
          </>
        ) : isTheater && (featured as StrapiTheaterShow).posterUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={(featured as StrapiTheaterShow).posterUrl}
              alt={posterAltForTheater((featured as StrapiTheaterShow).title)}
              width={1200}
              height={1800}
              fetchPriority="high"
              decoding="async"
              sizes="100vw"
              className="h-full w-full object-cover opacity-55"
            />
          </>
        ) : isTheater ? (
          <div
            className="h-full w-full opacity-40"
            style={{
              background: `linear-gradient(135deg, ${(featured as StrapiTheaterShow).gradientFrom}, ${(featured as StrapiTheaterShow).gradientTo})`,
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
            {isTheater ? ` · ${(featured as StrapiTheaterShow).venue}` : ""}
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
