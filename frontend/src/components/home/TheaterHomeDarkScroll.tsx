import type { ReactNode } from "react";
import type { StrapiTheaterShow } from "@/lib/api";
import EventCard from "@/components/EventCard";
import { theaterCardSubtitle } from "@/lib/theaterShowMeta";
import { theaterGenreLabel } from "@/lib/theaterGenre";
import { cn } from "@/lib/utils";

type Accent = "amber" | "rose" | "emerald" | "sky";

const ACCENT: Record<
  Accent,
  {
    glow: string;
    eyebrow: string;
    emptyBorder: string;
    emptyText: string;
    link: string;
    pulse: string;
  }
> = {
  amber: {
    glow: "absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-amber-500/10 blur-[90px]",
    eyebrow: "text-amber-200/85",
    emptyBorder: "border-amber-500/20 bg-amber-950/20",
    emptyText: "text-amber-100/85",
    link: "text-amber-200/95 hover:text-amber-50",
    pulse: "bg-white/10",
  },
  rose: {
    glow: "absolute -right-16 top-1/4 h-72 w-72 rounded-full bg-rose-400/10 blur-[90px]",
    eyebrow: "text-rose-200/85",
    emptyBorder: "border-rose-500/20 bg-rose-950/20",
    emptyText: "text-rose-100/85",
    link: "text-rose-200/95 hover:text-rose-50",
    pulse: "bg-white/10",
  },
  emerald: {
    glow: "absolute -left-16 top-1/3 h-72 w-72 rounded-full bg-emerald-400/10 blur-[90px]",
    eyebrow: "text-emerald-200/85",
    emptyBorder: "border-emerald-500/20 bg-emerald-950/20",
    emptyText: "text-emerald-100/85",
    link: "text-emerald-200/95 hover:text-emerald-50",
    pulse: "bg-white/10",
  },
  sky: {
    glow: "absolute -right-16 top-1/3 h-72 w-72 rounded-full bg-sky-400/10 blur-[90px]",
    eyebrow: "text-sky-200/85",
    emptyBorder: "border-sky-500/20 bg-sky-950/20",
    emptyText: "text-sky-100/85",
    link: "text-sky-200/95 hover:text-sky-50",
    pulse: "bg-white/10",
  },
};

type Props = {
  eyebrow: string;
  title: string;
  accent?: Accent;
  shows: StrapiTheaterShow[];
  loading: boolean;
  failed: boolean;
  emptyMessage: string;
  seeAllHref: string;
  seeAllLabel: string;
  listAriaLabel: string;
  badgeForShow?: (show: StrapiTheaterShow) => string | undefined;
  glowSide?: "left" | "right";
};

export function TheaterHomeDarkScroll({
  eyebrow,
  title,
  accent = "amber",
  shows,
  loading,
  failed,
  emptyMessage,
  seeAllHref,
  seeAllLabel,
  listAriaLabel,
  badgeForShow,
}: Props): ReactNode {
  const a = ACCENT[accent];

  return (
    <div className="section-black relative overflow-hidden py-14 md:py-20">
      <div aria-hidden className={cn("pointer-events-none", a.glow)} />
      <div className="container relative z-[1] max-w-7xl">
        <div>
          <span
            className={cn(
              "mb-2 block font-body text-[10px] uppercase tracking-[0.24em]",
              a.eyebrow,
            )}
          >
            {eyebrow}
          </span>
          <h2 className="font-display text-3xl font-bold leading-tight text-white md:text-5xl md:leading-[1.1]">
            {title}
          </h2>
        </div>
        {loading ? (
          <div className="mt-10 flex min-h-[14rem] gap-4 overflow-hidden pb-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-[10.5rem] w-[15rem] shrink-0 animate-pulse rounded-lg md:h-[11.5rem] md:w-[17rem]",
                  a.pulse,
                )}
              />
            ))}
          </div>
        ) : failed ? (
          <div className={cn("mt-10 max-w-xl rounded-xl border px-5 py-5 md:px-6 md:py-6", a.emptyBorder)}>
            <p className={cn("text-sm leading-relaxed font-body", a.emptyText)}>
              Δεν ήταν δυνατή η φόρτωση.
            </p>
          </div>
        ) : shows.length === 0 ? (
          <div className="mt-10 max-w-2xl rounded-xl border border-white/10 bg-black/35 px-5 py-6 md:px-7 md:py-7">
            <p className="font-body text-sm leading-relaxed text-white/75 md:text-[0.9375rem]">
              {emptyMessage}
            </p>
            <a
              href={seeAllHref}
              className={cn(
                "mt-5 inline-flex text-sm font-semibold transition-colors",
                a.link,
              )}
            >
              {seeAllLabel}
              <span aria-hidden className="ml-1 opacity-75">
                →
              </span>
            </a>
          </div>
        ) : (
          <>
            <ul
              className="mt-10 flex list-none items-stretch gap-4 overflow-x-auto scrollbar-hide pb-2"
              aria-label={listAriaLabel}
            >
              {shows.map((show, i) => (
                <li key={show.id} className="flex h-full min-h-0 shrink-0">
                  <EventCard
                    slug={show.slug}
                    title={show.title}
                    subtitle={theaterCardSubtitle(show)}
                    genre={theaterGenreLabel(show.genre)}
                    duration={show.duration ?? 0}
                    posterUrl={show.posterUrl}
                    type="theater"
                    badge={
                      show.soldOut
                        ? "SOLD OUT"
                        : badgeForShow?.(show) ?? undefined
                    }
                    compactMovieMeta
                    darkSectionCard
                    className="w-[15rem] md:w-[17rem]"
                    index={i}
                    posterPriority={false}
                    posterEager={false}
                  />
                </li>
              ))}
            </ul>
            <div className="mt-10 border-t border-white/10 pt-8 text-center">
              <a
                href={seeAllHref}
                className={cn(
                  "inline-flex items-center gap-1 text-sm font-semibold transition-colors",
                  a.link,
                )}
              >
                {seeAllLabel}
                <span aria-hidden className="opacity-75">
                  →
                </span>
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
