import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import { Link } from "react-router-dom";
import { useHomeStaticLcpOnPage } from "@/contexts/HomeStaticLcpContext";
import type { StrapiMovie, StrapiShowtime } from "@/lib/api";
import { heroMovieCta, resolveHeroScheduleDisplay } from "@/lib/heroScheduleLine";
import { movieTitleLines, posterAltForMovie } from "@/lib/movieTitles";
import { synopsisExcerpt } from "@/lib/synopsisExcerpt";
import { HOME_HERO_COMPACT_SECTION_CLASS } from "@/lib/homeHeroLayout";
import { useHomeLcpDone } from "@/hooks/useHomeLcpDone";
import PosterPicture from "@/components/PosterPicture";
import MoviePosterMeta from "@/components/MoviePosterMeta";
import { posterLcpSrc } from "@/lib/posterDelivery";
import { cn } from "@/lib/utils";

const AUTO_ADVANCE_MS = 8000;
const HERO_SYNOPSIS_MAX = 280;
const HERO_SWIPE_MIN_PX = 48;

function useHeroSwipe(
  enabled: boolean,
  activeIndex: number,
  goTo: (index: number) => void,
): { onTouchStart: (e: TouchEvent) => void; onTouchEnd: (e: TouchEvent) => void } {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      const t = e.changedTouches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
    },
    [enabled],
  );

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      touchStart.current = null;
      if (Math.abs(dx) < HERO_SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) goTo(activeIndex + 1);
      else goTo(activeIndex - 1);
    },
    [enabled, activeIndex, goTo],
  );

  return { onTouchStart, onTouchEnd };
}

const navBtnClass =
  "flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-[#13143E]/85 text-white shadow-lg shadow-black/30 backdrop-blur-sm transition-colors hover:border-amber-200/50 hover:bg-[#1e1c4a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300/80";

export function MostTalkedAboutHeroShell() {
  return (
    <section className={HOME_HERO_COMPACT_SECTION_CLASS} aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1c1a52] via-[#13143E] to-[#0d0c24]" />
      <div className="relative z-10 container flex max-w-7xl items-center px-4 py-8 md:min-h-[580px] md:px-14 md:py-14">
        <div className="grid w-full grid-cols-1 items-center gap-10 md:grid-cols-[1fr_auto] md:gap-12">
          <div className="space-y-4">
            <div className="h-9 w-56 rounded-full bg-white/10" />
            <div className="h-10 w-4/5 max-w-lg rounded bg-white/10 md:h-12" />
            <div className="h-4 w-full max-w-2xl rounded bg-white/10" />
            <div className="h-4 w-full max-w-xl rounded bg-white/10" />
            <div className="h-4 w-5/6 max-w-lg rounded bg-white/10" />
            <div className="h-10 w-36 rounded bg-white/15" />
          </div>
          <div className="mx-auto aspect-[2/3] w-48 animate-pulse rounded-xl bg-white/10 md:mx-0 md:w-60 lg:w-64" />
        </div>
      </div>
    </section>
  );
}

type MostTalkedAboutHeroProps = {
  movies: StrapiMovie[];
  showtimes?: StrapiShowtime[];
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

function heroSynopsisText(movie: StrapiMovie): string {
  return synopsisExcerpt(movie.synopsis ?? "", HERO_SYNOPSIS_MAX);
}

function heroMetaLine(movie: StrapiMovie): string {
  const parts: string[] = [];
  const director = (movie.director ?? "").trim();
  if (director && director !== "—") parts.push(`Σκηνοθεσία: ${director}`);
  return parts.join(" · ");
}

const MostTalkedAboutHero = ({ movies, showtimes = [], loading }: MostTalkedAboutHeroProps) => {
  const markLcpDone = useHomeLcpDone();
  const staticLcpOnPage = useHomeStaticLcpOnPage();
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
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    const timer = window.setInterval(() => goTo(activeIndex + 1), AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [activeIndex, movies.length, goTo]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const staticEl = document.getElementById("home-static-lcp");
    const isMobileViewport = window.matchMedia("(max-width: 767px)").matches;

    /** Mobile: χωρίς αναμονή loading (deadlock) — desktop: περίμενε live hero (CLS). */
    if (staticEl && isMobileViewport) {
      let cancelled = false;
      let idleId: number | undefined;
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          const finish = () => {
            if (!cancelled) markLcpDone();
          };
          if (typeof requestIdleCallback !== "undefined") {
            idleId = requestIdleCallback(finish, { timeout: 1200 });
          } else {
            finish();
          }
        });
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(frame);
        if (idleId !== undefined && typeof cancelIdleCallback !== "undefined") {
          cancelIdleCallback(idleId);
        }
      };
    }

    if (loading) return;
    if (movies.length === 0) {
      markLcpDone();
      return;
    }
    if (!staticEl) {
      markLcpDone();
      return;
    }
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => markLcpDone());
    });
    return () => cancelAnimationFrame(frame);
  }, [loading, movies.length, markLcpDone]);

  const hasStaticLcpDom =
    typeof document !== "undefined" && Boolean(document.getElementById("home-static-lcp"));
  const hasStaticLcp = staticLcpOnPage || hasStaticLcpDom;
  const prioritizePoster = !hasStaticLcp && activeIndex === 0;
  const hasCarousel = movies.length > 1;
  const heroSwipe = useHeroSwipe(hasCarousel, activeIndex, goTo);

  if (loading && movies.length === 0) {
    if (hasStaticLcp) return null;
    return <MostTalkedAboutHeroShell />;
  }

  if (movies.length === 0) {
    return null;
  }

  const active = movies[activeIndex];
  const titles = movieTitleLines(active);
  const synopsis = heroSynopsisText(active);
  const schedule = resolveHeroScheduleDisplay(active, showtimes);
  const cta = heroMovieCta(active.slug);
  const meta = heroMetaLine(active);
  return (
    <section
      className={cn(HOME_HERO_COMPACT_SECTION_CLASS, hasCarousel && "touch-pan-y")}
      data-home-hero-live
      aria-roledescription="carousel"
      aria-label="Πολυσυζητημένες ταινίες"
      onTouchStart={heroSwipe.onTouchStart}
      onTouchEnd={heroSwipe.onTouchEnd}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#1c1a52] via-[#13143E] to-[#0d0c24]" />
      <div
        className="pointer-events-none absolute -right-8 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-amber-500/12 blur-3xl md:right-[10%]"
        aria-hidden
      />

      {hasCarousel ? (
        <>
          <HeroNavButton
            direction="prev"
            onClick={() => goTo(activeIndex - 1)}
            className="absolute left-5 top-1/2 z-20 hidden -translate-y-1/2 md:flex"
          />
          <HeroNavButton
            direction="next"
            onClick={() => goTo(activeIndex + 1)}
            className="absolute right-5 top-1/2 z-20 hidden -translate-y-1/2 md:flex"
          />
        </>
      ) : null}

      <div
        className={cn(
          "relative z-10 container flex max-w-7xl items-center py-6 md:py-14",
          hasCarousel ? "px-4 md:px-16" : "px-4 md:px-8",
        )}
      >
        <div className="grid w-full grid-cols-1 items-center gap-6 max-md:[&>*:first-child]:order-2 max-md:[&>*:last-child]:order-1 md:grid-cols-[minmax(0,1fr)_auto] md:gap-12 lg:gap-16">
          <div className="min-w-0 max-w-2xl lg:max-w-3xl max-md:text-center">
            <div className="mb-5">
              <span className="inline-flex items-center rounded-full border border-amber-300/55 bg-gradient-to-r from-amber-400/30 via-amber-500/20 to-amber-600/10 px-4 py-2.5 font-body text-[11px] font-bold uppercase tracking-[0.22em] text-amber-50 shadow-[0_4px_28px_rgba(251,191,36,0.22)] ring-1 ring-amber-100/25 md:px-5 md:text-xs md:tracking-[0.24em]">
                Πολυσυζητημένες
              </span>
            </div>
            <p className="font-display text-3xl font-bold leading-[1.08] text-white md:text-4xl lg:text-[2.75rem]">{titles.primary}</p>
            {titles.secondary ? (
              <p className="font-display mt-2 text-xl font-medium leading-tight text-white/90 md:text-2xl">{titles.secondary}</p>
            ) : null}
            {(active.genre ?? "").trim() ? (
              <span className="mt-3 inline-flex rounded border border-white/15 bg-white/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200/95">
                {active.genre}
              </span>
            ) : null}
            <p
              className={cn(
                "mt-4 font-body text-base leading-relaxed text-white md:mt-5 md:text-lg md:leading-[1.7]",
                synopsis ? "line-clamp-3 md:line-clamp-6" : "italic text-white/90",
              )}
            >
              {synopsis || "Δεν υπάρχει σύνοψη για αυτή την ταινία."}
            </p>
            {schedule.mode === "release" ? (
              <p className="mt-3 font-body text-sm font-medium text-white md:text-base">{schedule.label}</p>
            ) : null}
            {meta ? <p className="mt-3 font-body text-sm text-white/55">{meta}</p> : null}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 md:mt-8 md:justify-start">
              <Link
                to={cta.to}
                className="inline-flex items-center rounded bg-white px-6 py-3 text-sm font-semibold text-[#13143E] transition-colors hover:bg-white/90"
              >
                {cta.label}
              </Link>
              {hasCarousel ? (
                <span className="font-body text-xs font-medium tabular-nums tracking-wide text-amber-200/75">
                  {activeIndex + 1} / {movies.length}
                </span>
              ) : null}
            </div>
          </div>

          <figure className="relative mx-auto w-40 shrink-0 sm:w-44 md:mx-0 md:w-60 lg:w-64">
            <div className="pointer-events-none absolute -inset-4 rounded-2xl bg-amber-400/18 blur-2xl" aria-hidden />
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-[#1a1844]/80 shadow-2xl shadow-black/45 ring-1 ring-white/20">
              {active.posterUrl ? (
                <PosterPicture
                  key={active.id}
                  src={posterLcpSrc(active.posterUrl, active.posterSrcSet) ?? active.posterUrl}
                  srcSet={active.posterSrcSet}
                  alt={posterAltForMovie(active)}
                  width={512}
                  height={768}
                  fetchPriority={prioritizePoster ? "high" : "auto"}
                  loading={prioritizePoster ? "eager" : "lazy"}
                  decoding={prioritizePoster ? "sync" : "async"}
                  sizes="(max-width: 768px) 192px, 256px"
                  className="h-full w-full object-contain object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#2a2444] text-sm text-white/40">Χωρίς αφίσα</div>
              )}
              <MoviePosterMeta movie={active} />
            </div>
          </figure>
        </div>
      </div>

      {hasCarousel ? (
        <div className="relative z-10 flex justify-center gap-2 pb-5 pt-2 md:absolute md:bottom-7 md:left-0 md:right-0 md:pb-0 md:pt-0">
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
