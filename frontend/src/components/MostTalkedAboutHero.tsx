import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { StrapiMovie } from "@/lib/api";
import { movieTitleLines, posterAltForMovie } from "@/lib/movieTitles";
import { synopsisExcerpt } from "@/lib/synopsisExcerpt";
import { HOME_HERO_COMPACT_SECTION_CLASS } from "@/lib/homeHeroLayout";
import { useIsHydrated } from "@/hooks/useIsHydrated";
import { useHomeLcpDone } from "@/hooks/useHomeLcpDone";
import PosterPicture from "@/components/PosterPicture";
import { posterLcpSrc } from "@/lib/posterDelivery";

const AUTO_ADVANCE_MS = 8000;

export function MostTalkedAboutHeroShell() {
  return (
    <section className={HOME_HERO_COMPACT_SECTION_CLASS} aria-hidden="true">
      <div className="absolute inset-0 bg-[#13143E]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#13143E]/95 via-[#13143E]/80 to-[#13143E]/40" />
      <div className="relative z-10 container flex h-full max-w-7xl items-center py-8 md:py-10">
        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-[1fr_9rem] md:gap-8">
          <div className="space-y-3">
            <div className="h-3 w-40 rounded bg-white/10" />
            <div className="h-9 w-4/5 max-w-md rounded bg-white/10 md:h-10" />
            <div className="h-4 w-full max-w-sm rounded bg-white/10" />
            <div className="h-4 w-5/6 max-w-xs rounded bg-white/10" />
            <div className="h-9 w-32 rounded bg-white/15" />
          </div>
          <div className="hidden aspect-[2/3] w-full max-w-[9rem] animate-pulse rounded-lg bg-white/10 md:block" />
        </div>
      </div>
    </section>
  );
}

type MostTalkedAboutHeroProps = {
  movies: StrapiMovie[];
  loading?: boolean;
};

const MostTalkedAboutHero = ({ movies, loading }: MostTalkedAboutHeroProps) => {
  const isHydrated = useIsHydrated();
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
    if (!isHydrated || loading || movies.length === 0) return;
    const first = movies[0];
    if (!first.posterUrl?.trim()) markLcpDone();
  }, [isHydrated, loading, movies, markLcpDone]);

  if (loading || !isHydrated) {
    return <MostTalkedAboutHeroShell />;
  }

  if (movies.length === 0) {
    return null;
  }

  const active = movies[activeIndex];
  const titles = movieTitleLines(active);
  const excerpt = synopsisExcerpt(active.synopsis, 130);
  const notifyPosterReady = () => markLcpDone();

  return (
    <section className={HOME_HERO_COMPACT_SECTION_CLASS} aria-roledescription="carousel" aria-label="Πιο πολυσυζητημένες ταινίες">
      <div className="absolute inset-0">
        {active.posterUrl ? (
          <PosterPicture
            key={active.id}
            src={posterLcpSrc(active.posterUrl, active.posterSrcSet) ?? active.posterUrl}
            srcSet={active.posterSrcSet}
            alt={posterAltForMovie(active)}
            width={480}
            height={720}
            fetchPriority={activeIndex === 0 ? "high" : "auto"}
            loading={activeIndex === 0 ? "eager" : "lazy"}
            sizes="(max-width: 768px) 50vw, 280px"
            className="absolute right-0 top-0 h-full w-[55%] object-cover object-top opacity-45 md:w-[42%] md:opacity-50"
            onLoad={activeIndex === 0 ? notifyPosterReady : undefined}
          />
        ) : (
          <div className="absolute right-0 top-0 h-full w-[55%] bg-[#2a2444] md:w-[42%]" />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#13143E] via-[#13143E]/92 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#13143E]/80 via-transparent to-transparent md:hidden" />

      <div className="relative z-10 container flex h-full max-w-7xl items-center py-8 md:py-10">
        <div className="grid w-full grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto] md:gap-6">
          <div className="min-w-0 max-w-xl">
            <span className="mb-2 block font-body text-[10px] uppercase tracking-[0.22em] text-amber-200/90">
              Πιο πολυσυζητημένες
            </span>
            <h2 className="font-display text-2xl font-bold leading-tight text-white md:text-3xl">{titles.primary}</h2>
            {titles.secondary ? (
              <p className="font-display mt-1 text-lg font-medium leading-tight text-white/85 md:text-xl">{titles.secondary}</p>
            ) : null}
            {excerpt ? (
              <p className="mt-3 font-body text-sm leading-relaxed text-white/70 md:text-[0.9375rem]">{excerpt}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                to={`/movies/${active.slug}`}
                className="inline-flex items-center rounded bg-white px-4 py-2 text-sm font-semibold text-[#13143E] transition-colors hover:bg-white/90"
              >
                Δες προβολές
              </Link>
              {active.genre ? (
                <span className="text-xs uppercase tracking-wider text-white/50">{active.genre}</span>
              ) : null}
            </div>
            {movies.length > 1 ? (
              <p className="mt-3 font-body text-[11px] text-white/40">
                {activeIndex + 1} / {movies.length}
              </p>
            ) : null}
          </div>

          {movies.length > 1 ? (
            <div className="flex items-center justify-end gap-2 md:flex-col md:justify-center md:gap-3">
              <button
                type="button"
                onClick={() => goTo(activeIndex - 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Προηγούμενη ταινία"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => goTo(activeIndex + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Επόμενη ταινία"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {movies.length > 1 ? (
        <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-1.5 md:bottom-5">
          {movies.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ταινία ${i + 1}: ${m.title}`}
              aria-current={i === activeIndex ? "true" : undefined}
              className={`h-1 rounded-full transition-all ${
                i === activeIndex ? "w-6 bg-amber-300/95" : "w-2 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default MostTalkedAboutHero;
