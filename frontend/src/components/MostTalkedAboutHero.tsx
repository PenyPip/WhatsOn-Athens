import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { StrapiMovie } from "@/lib/api";
import { movieTitleLines, posterAltForMovie } from "@/lib/movieTitles";
import { synopsisExcerpt } from "@/lib/synopsisExcerpt";
import { HOME_HERO_COMPACT_SECTION_CLASS } from "@/lib/homeHeroLayout";
import { useHomeLcpDone } from "@/hooks/useHomeLcpDone";
import PosterPicture from "@/components/PosterPicture";
import { posterLcpSrc } from "@/lib/posterDelivery";
import { cn } from "@/lib/utils";

const AUTO_ADVANCE_MS = 8000;

const navBtnClass =
  "flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-[#13143E]/85 text-white shadow-lg shadow-black/30 backdrop-blur-sm transition-colors hover:border-amber-200/50 hover:bg-[#1e1c4a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300/80";

export function MostTalkedAboutHeroShell() {
  return (
    <section className={HOME_HERO_COMPACT_SECTION_CLASS} aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1c1a52] via-[#13143E] to-[#0d0c24]" />
      <div className="relative z-10 container flex min-h-[400px] max-w-7xl items-center px-12 py-10 md:min-h-[440px] md:px-14">
        <div className="grid w-full grid-cols-1 items-center gap-8 md:grid-cols-[1fr_auto] md:gap-10">
          <div className="space-y-3">
            <div className="h-8 w-52 rounded-full bg-white/10" />
            <div className="h-9 w-4/5 max-w-md rounded bg-white/10 md:h-10" />
            <div className="h-4 w-full max-w-sm rounded bg-white/10" />
            <div className="h-9 w-32 rounded bg-white/15" />
          </div>
          <div className="mx-auto aspect-[2/3] w-44 animate-pulse rounded-xl bg-white/10 md:mx-0 md:w-52" />
        </div>
      </div>
    </section>
  );
}

type MostTalkedAboutHeroProps = {
  movies: StrapiMovie[];
  loading?: boolean;
};

function HeroNavButton({
  direction,
  onClick,
  className,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(navBtnClass, className)}
      aria-label={direction === "prev" ? "Προηγούμενη ταινία" : "Επόμενη ταινία"}
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        {direction === "prev" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
      </svg>
    </button>
  );
}

const MostTalkedAboutHero = ({ movies, loading }: MostTalkedAboutHeroProps) => {
  const markLcpDone = useHomeLcpDone();
  const [activeIndex, setActiveIndex] = useState(0);

  const goTo = useCallback(
    (index: number) => {
      if (movies.length === 0) return;
      setActiveIndex((index + movies.length) % movies.length);
    },
    [movies.length],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [movies.length]);

  useEffect(() => {
    if (movies.length <= 1) return;
    const timer = window.setInterval(() => goTo(activeIndex + 1), AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [activeIndex, movies.length, goTo]);

  useEffect(() => {
    if (loading || movies.length === 0) return;
    const first = movies[0];
    if (!first.posterUrl?.trim()) markLcpDone();
  }, [loading, movies, markLcpDone]);

  if (loading && movies.length === 0) {
    return <MostTalkedAboutHeroShell />;
  }

  if (movies.length === 0) {
    return null;
  }

  const active = movies[activeIndex];
  const titles = movieTitleLines(active);
  const excerpt = synopsisExcerpt(active.synopsis, 130);
  const notifyPosterReady = () => markLcpDone();
  const hasCarousel = movies.length > 1;

  return (
    <section className={HOME_HERO_COMPACT_SECTION_CLASS} aria-roledescription="carousel" aria-label="Πιο πολυσυζητημένες ταινίες">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1c1a52] via-[#13143E] to-[#0d0c24]" />
      <div
        className="pointer-events-none absolute -right-8 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-amber-500/10 blur-3xl md:right-[12%]"
        aria-hidden
      />

      {hasCarousel ? (
        <>
          <HeroNavButton
            direction="prev"
            onClick={() => goTo(activeIndex - 1)}
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 md:left-4"
          />
          <HeroNavButton
            direction="next"
            onClick={() => goTo(activeIndex + 1)}
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 md:right-4"
          />
        </>
      ) : null}

      <div
        className={cn(
          "relative z-10 container flex max-w-7xl items-center py-8 md:py-10",
          hasCarousel ? "px-12 md:px-16" : "px-4 md:px-6",
        )}
      >
        <div className="grid w-full grid-cols-1 items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:gap-10 lg:gap-14">
          <div className="min-w-0 max-w-xl">
            <div className="mb-4">
              <span className="inline-flex items-center rounded-full border border-amber-300/55 bg-gradient-to-r from-amber-400/30 via-amber-500/20 to-amber-600/10 px-4 py-2 font-body text-[11px] font-bold uppercase tracking-[0.22em] text-amber-50 shadow-[0_4px_28px_rgba(251,191,36,0.22)] ring-1 ring-amber-100/25 md:text-xs md:tracking-[0.24em]">
                Πιο πολυσυζητημένες
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold leading-tight text-white md:text-[2rem] lg:text-4xl">{titles.primary}</h2>
            {titles.secondary ? (
              <p className="font-display mt-1.5 text-lg font-medium leading-tight text-white/88 md:text-xl">{titles.secondary}</p>
            ) : null}
            {excerpt ? (
              <p className="mt-3 font-body text-sm leading-relaxed text-white/72 md:text-[0.9375rem]">{excerpt}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                to={`/movies/${active.slug}`}
                className="inline-flex items-center rounded bg-white px-5 py-2.5 text-sm font-semibold text-[#13143E] transition-colors hover:bg-white/90"
              >
                Δες προβολές
              </Link>
              {active.genre ? (
                <span className="text-xs uppercase tracking-wider text-white/55">{active.genre}</span>
              ) : null}
            </div>
            {hasCarousel ? (
              <p className="mt-4 font-body text-[11px] font-medium tabular-nums tracking-wide text-amber-200/70">
                {activeIndex + 1} από {movies.length}
              </p>
            ) : null}
          </div>

          <figure className="relative mx-auto w-[10.5rem] shrink-0 sm:w-44 md:mx-0 md:w-48 lg:w-52">
            <div
              className="pointer-events-none absolute -inset-3 rounded-2xl bg-amber-400/15 blur-xl"
              aria-hidden
            />
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-[#1a1844]/80 shadow-2xl shadow-black/40 ring-1 ring-white/15">
              {active.posterUrl ? (
                <PosterPicture
                  key={active.id}
                  src={posterLcpSrc(active.posterUrl, active.posterSrcSet) ?? active.posterUrl}
                  srcSet={active.posterSrcSet}
                  alt={posterAltForMovie(active)}
                  width={416}
                  height={624}
                  fetchPriority={activeIndex === 0 ? "high" : "auto"}
                  loading={activeIndex === 0 ? "eager" : "lazy"}
                  sizes="(max-width: 768px) 168px, 208px"
                  className="h-full w-full object-contain object-center"
                  onLoad={activeIndex === 0 ? notifyPosterReady : undefined}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#2a2444] text-xs text-white/40">Χωρίς αφίσα</div>
              )}
            </div>
          </figure>
        </div>
      </div>

      {hasCarousel ? (
        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2 pb-0.5 md:bottom-5">
          {movies.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ταινία ${i + 1}: ${m.title}`}
              aria-current={i === activeIndex ? "true" : undefined}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === activeIndex ? "w-7 bg-amber-300" : "w-2 bg-white/35 hover:bg-white/55",
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default MostTalkedAboutHero;
