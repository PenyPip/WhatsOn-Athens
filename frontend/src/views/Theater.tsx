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
    <div
      className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border border-white/15 bg-black/20 p-1.5 shadow-inner"
      role="tablist"
      aria-label="Ενότητες θεάτρου"
    >
      <Link
        to="/theater"
        role="tab"
        aria-selected={!kidsActive}
        className={cn(
          "rounded-xl px-3 py-3.5 text-center text-sm font-semibold transition-colors md:py-4 md:text-base",
          !kidsActive
            ? "bg-white text-[#13143E] shadow-sm"
            : "text-white/75 hover:bg-white/10 hover:text-white",
        )}
      >
        Όλες οι παραστάσεις
      </Link>
      <Link
        to={THEATER_KIDS_PATH}
        role="tab"
        aria-selected={kidsActive}
        className={cn(
          "rounded-xl px-3 py-3.5 text-center text-sm font-semibold transition-colors md:py-4 md:text-base",
          kidsActive
            ? "bg-gradient-to-br from-sky-200 via-amber-100 to-rose-200 text-[#13143E] shadow-sm"
            : "text-white/75 hover:bg-white/10 hover:text-white",
        )}
      >
        Παιδικές
      </Link>
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
        {kidsOnly ? (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <span className="absolute -left-8 top-10 h-28 w-28 rounded-full bg-amber-300/25 blur-2xl" />
            <span className="absolute right-8 top-6 h-20 w-20 rounded-full bg-rose-300/30 blur-xl" />
            <span className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-sky-200/25 blur-2xl" />
            <span className="absolute right-1/4 top-1/2 h-3 w-3 rounded-full bg-amber-200/70" />
            <span className="absolute left-[12%] top-[55%] h-2.5 w-2.5 rounded-full bg-rose-200/80" />
            <span className="absolute right-[18%] top-[38%] h-2 w-2 rounded-full bg-sky-100/80" />
          </div>
        ) : null}
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

      <div
        className={cn(
          "container mb-6",
          kidsOnly && "relative",
        )}
      >
        {kidsOnly ? (
          <div
            aria-hidden
            className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-amber-200/40 blur-3xl"
          />
        ) : null}
        <TheaterLikePromo />
      </div>

      <div
        className={cn(
          "container",
          kidsOnly &&
            "relative rounded-3xl border border-sky-200/50 bg-gradient-to-b from-sky-50/90 via-amber-50/40 to-rose-50/50 px-3 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] md:px-6 md:py-7",
        )}
      >
        {kidsOnly ? (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full border-4 border-dashed border-sky-300/40" />
            <span className="absolute -bottom-8 left-8 h-28 w-28 rounded-full border-4 border-dashed border-amber-300/35" />
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
