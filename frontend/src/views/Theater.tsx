import { useCallback, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import EventCard from "@/components/EventCard";
import PageListHeader, {
  PAGE_LIST_SHELL_CLASS,
  PAGE_LIST_SUBTITLE_CLASS,
  PAGE_LIST_TITLE_CLASS,
} from "@/components/PageListHeader";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import TheaterLikePromo from "@/components/TheaterLikePromo";
import TheaterDateFilters from "@/components/TheaterDateFilters";
import { useTheaterShows, useTheaterPerformances, useVenuesForProgram } from "@/hooks/useStrapi";
import { theaterGenreLabel } from "@/lib/theaterGenre";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";
import {
  detectTheaterQuickDateFilter,
  normalizeTheaterDateRange,
  theaterQuickDateRange,
  type TheaterQuickDateFilter,
} from "@/lib/theaterDateFilters";
import { resolveTheaterTicketPrices, theaterPriceLabel } from "@/lib/theaterPricing";
import {
  theaterShowMatchesListFilters,
  type TheaterRegionFilter,
} from "@/lib/theaterRegionFilters";
import {
  theaterPerformanceSummary,
  theaterShowHasNewlyAddedPerformances,
  theaterShowHasUpcomingPerformances,
  theaterShowListBadge,
} from "@/lib/theaterPerformances";
import {
  isKidsTheaterShow,
  isTheaterKidsPath,
  THEATER_KIDS_PATH,
} from "@/lib/theaterKids";
import { cn } from "@/lib/utils";

function TheaterSectionTabs({ kidsActive }: { kidsActive: boolean }) {
  return (
    <nav className="mb-5 flex flex-wrap items-end gap-6 md:gap-8" aria-label="Ενότητες θεάτρου">
      <Link
        to="/theater"
        aria-current={!kidsActive ? "page" : undefined}
        className={cn(
          "border-b-2 pb-1.5 text-sm tracking-wide transition-colors md:text-[0.95rem]",
          !kidsActive
            ? "border-white font-medium text-white"
            : "border-transparent text-white/55 hover:text-white/85",
        )}
      >
        Όλες οι παραστάσεις
      </Link>
      <Link
        to={THEATER_KIDS_PATH}
        aria-current={kidsActive ? "page" : undefined}
        className={cn(
          "border-b-2 pb-1.5 text-sm tracking-wide transition-colors md:text-[0.95rem]",
          kidsActive
            ? "border-amber-200/90 font-medium text-amber-50"
            : "border-transparent text-white/55 hover:text-white/85",
        )}
      >
        Παιδικές
      </Link>
    </nav>
  );
}

/** Διαφανείς φούσκες - πιο εμφανείς, χωρίς blur «λάσπη». */
function KidsBubbleField({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <span className="absolute -left-6 top-4 h-36 w-36 rounded-full border border-white/35 bg-white/[0.12] shadow-[inset_0_0_24px_rgba(255,255,255,0.18)] md:h-44 md:w-44" />
      <span className="absolute right-4 top-2 h-24 w-24 rounded-full border border-amber-100/40 bg-amber-200/20 shadow-[inset_0_0_18px_rgba(253,230,138,0.25)] md:h-28 md:w-28" />
      <span className="absolute bottom-2 left-[28%] h-20 w-20 rounded-full border border-rose-100/35 bg-rose-200/18 md:h-24 md:w-24" />
      <span className="absolute right-[22%] top-[42%] h-14 w-14 rounded-full border border-sky-100/45 bg-sky-100/15" />
      <span className="absolute left-[8%] top-[58%] h-10 w-10 rounded-full border border-white/30 bg-white/10" />
      <span className="absolute right-[12%] bottom-8 h-16 w-16 rounded-full border border-white/25 bg-white/[0.08]" />
      <span className="absolute left-[55%] top-8 h-8 w-8 rounded-full border border-amber-50/50 bg-amber-100/20" />
      <span className="absolute left-[40%] top-[30%] h-5 w-5 rounded-full border border-white/40 bg-white/15" />
    </div>
  );
}

const TheaterPage = () => {
  const { pathname } = useLocation();
  const kidsOnly = isTheaterKidsPath(pathname);
  const pageSeo = kidsOnly ? staticPageSeo.theaterKids : staticPageSeo.theater;
  usePageSeo({
    title: pageSeo.title,
    description: pageSeo.description,
    path: pageSeo.path,
    canonicalPath: pageSeo.path,
  });

  const { data: theaterShows, isLoading: showsLoading } = useTheaterShows();
  const { data: theaterPerformances, isLoading: performancesLoading } = useTheaterPerformances();
  const { data: venues } = useVenuesForProgram();
  /** Spinner μόνο χωρίς cache - όχι σε background refetch (αποφεύγει flicker). */
  const isLoading =
    (theaterShows === undefined && showsLoading) ||
    (theaterPerformances === undefined && performancesLoading);
  const [regionFilter, setRegionFilter] = useState<TheaterRegionFilter>("all");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  const performancesByShowSlug = useMemo(() => {
    const m = new Map<string, NonNullable<typeof theaterPerformances>>();
    for (const p of theaterPerformances ?? []) {
      const slug = p.theaterShowSlug?.trim();
      if (!slug) continue;
      const list = m.get(slug) ?? [];
      list.push(p);
      m.set(slug, list);
    }
    return m;
  }, [theaterPerformances]);

  const upcomingShows = useMemo(() => {
    return (theaterShows ?? []).filter((show) => {
      const perfs = performancesByShowSlug.get(show.slug) ?? [];
      return theaterShowHasUpcomingPerformances(perfs);
    });
  }, [theaterShows, performancesByShowSlug]);

  const filteredShows = useMemo(() => {
    const venueList = venues ?? [];
    const cityFilterReady = venues !== undefined;
    const base = kidsOnly
      ? upcomingShows.filter(isKidsTheaterShow)
      : upcomingShows.filter((s) => !isKidsTheaterShow(s));
    const filtered = base.filter((show) => {
      const perfs = performancesByShowSlug.get(show.slug) ?? [];
      return theaterShowMatchesListFilters(show, perfs, venueList, {
        region: regionFilter,
        fromYmd: appliedFrom,
        toYmd: appliedTo,
        cityFilterReady,
      });
    });
    return [...filtered].sort((a, b) => {
      const aNew = theaterShowHasNewlyAddedPerformances(performancesByShowSlug.get(a.slug) ?? []);
      const bNew = theaterShowHasNewlyAddedPerformances(performancesByShowSlug.get(b.slug) ?? []);
      if (aNew === bNew) return 0;
      return aNew ? -1 : 1;
    });
  }, [upcomingShows, kidsOnly, regionFilter, appliedFrom, appliedTo, performancesByShowSlug, venues]);

  const activeQuickFilter = useMemo(
    () => detectTheaterQuickDateFilter(appliedFrom, appliedTo),
    [appliedFrom, appliedTo],
  );

  const applyDraftDates = useCallback(() => {
    const next = normalizeTheaterDateRange(draftFrom, draftTo);
    setAppliedFrom(next.from);
    setAppliedTo(next.to);
    setDraftFrom(next.from);
    setDraftTo(next.to);
  }, [draftFrom, draftTo]);

  const applyQuickFilter = useCallback((filter: TheaterQuickDateFilter) => {
    const next = theaterQuickDateRange(filter);
    setDraftFrom(next.from);
    setDraftTo(next.to);
    setAppliedFrom(next.from);
    setAppliedTo(next.to);
  }, []);

  const poolCount = kidsOnly
    ? upcomingShows.filter(isKidsTheaterShow).length
    : upcomingShows.filter((s) => !isKidsTheaterShow(s)).length;
  const hasShows = poolCount > 0;
  const hasActiveFilters = regionFilter !== "all" || Boolean(appliedFrom || appliedTo);

  return (
    <div className={cn(PAGE_LIST_SHELL_CLASS, kidsOnly && "theater-kids-page")}>
      <PageListHeader
        className={
          kidsOnly
            ? "relative overflow-hidden border-b border-sky-200/30 bg-gradient-to-br from-[#1a3a5c] via-[#2a5080] to-[#3d6b8f] md:pb-10"
            : undefined
        }
      >
        {kidsOnly ? <KidsBubbleField /> : null}
        <div className="relative z-[1]">
          <TheaterSectionTabs kidsActive={kidsOnly} />
          <h1 className={PAGE_LIST_TITLE_CLASS}>{kidsOnly ? "Παιδικές παραστάσεις" : "Θέατρο"}</h1>
          <p className={PAGE_LIST_SUBTITLE_CLASS}>
            {kidsOnly
              ? "Παιδικό θέατρο - πρόγραμμα, χώροι και ημερομηνίες για όλη την οικογένεια."
              : "Παραστάσεις, πρόγραμμα και ημερομηνίες - κάνε like σε ό,τι θες να δεις."}
          </p>
        </div>
      </PageListHeader>

      <div className={cn("container mb-6", kidsOnly && "relative overflow-hidden")}>
        {kidsOnly ? (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <span className="absolute -left-4 top-2 h-28 w-28 rounded-full border border-sky-300/50 bg-sky-200/25" />
            <span className="absolute right-6 top-0 h-16 w-16 rounded-full border border-amber-300/45 bg-amber-100/30" />
          </div>
        ) : null}
        <div className="relative z-[1]">
          <TheaterLikePromo />
        </div>
      </div>

      <div
        className={cn(
          "container",
          kidsOnly &&
            "relative overflow-hidden rounded-3xl border border-sky-200/55 bg-gradient-to-b from-sky-50/95 via-amber-50/45 to-rose-50/55 px-3 py-5 md:px-6 md:py-7",
        )}
      >
        {kidsOnly ? (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            <span className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-sky-400/35 bg-sky-200/30" />
            <span className="absolute -bottom-12 -left-8 h-44 w-44 rounded-full border border-amber-400/30 bg-amber-100/35" />
            <span className="absolute right-[30%] top-10 h-20 w-20 rounded-full border border-rose-300/35 bg-rose-100/25" />
            <span className="absolute left-[45%] bottom-6 h-12 w-12 rounded-full border border-sky-300/40 bg-white/40" />
            <span className="absolute right-16 bottom-16 h-8 w-8 rounded-full border border-amber-200/50 bg-amber-50/50" />
          </div>
        ) : null}
        <div className="relative z-[1]">
          {isLoading ? (
            <LoadingState message="Φόρτωση παραστάσεων..." />
          ) : !hasShows ? (
            <p className="text-sm text-muted-foreground">
              {kidsOnly
                ? "Δεν υπάρχουν παιδικές παραστάσεις προς το παρόν."
                : "Δεν υπάρχουν παραστάσεις προς το παρόν."}
            </p>
          ) : (
            <>
              <TheaterDateFilters
                className="mb-6"
                regionFilter={regionFilter}
                onRegionFilterChange={setRegionFilter}
                draftFrom={draftFrom}
                draftTo={draftTo}
                onDraftFromChange={setDraftFrom}
                onDraftToChange={setDraftTo}
                onApply={applyDraftDates}
                onQuickFilter={applyQuickFilter}
                activeQuickFilter={activeQuickFilter}
              />
              {filteredShows.length === 0 ? (
                <p className="mb-6 text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? "Δεν βρέθηκαν παραστάσεις με αυτά τα φίλτρα. Δοκίμασε άλλη περιοχή ή ημερομηνία."
                    : kidsOnly
                      ? "Δεν βρέθηκαν παιδικές παραστάσεις με αυτά τα φίλτρα."
                      : "Δεν βρέθηκαν παραστάσεις με αυτά τα φίλτρα."}
                </p>
              ) : null}
              <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredShows.map((show, i) => {
                  const priceLine = theaterPriceLabel(resolveTheaterTicketPrices(show));
                  const showPerformances = performancesByShowSlug.get(show.slug) ?? [];
                  const scheduleLine = theaterPerformanceSummary(showPerformances);
                  return (
                    <EventCard
                      key={show.id}
                      slug={show.slug}
                      title={show.title}
                      subtitle={show.director}
                      genre={theaterGenreLabel(show.genre)}
                      duration={show.duration}
                      posterUrl={show.posterUrl}
                      type="theater"
                      theaterPriceLine={priceLine ?? undefined}
                      theaterScheduleLine={scheduleLine ?? undefined}
                      index={i}
                      badge={
                        theaterShowListBadge(show, showPerformances) ??
                        (kidsOnly || isKidsTheaterShow(show) ? "Παιδική" : undefined)
                      }
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TheaterPage;
