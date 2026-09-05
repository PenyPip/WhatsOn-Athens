import { useCallback, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import EventCard from "@/components/EventCard";
import PageListHeader, { PAGE_LIST_SHELL_CLASS, PAGE_LIST_SUBTITLE_CLASS, PAGE_LIST_TITLE_CLASS } from "@/components/PageListHeader";
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
  filterKidsShowsForHome,
  isKidsTheaterShow,
  isTheaterKidsPath,
  THEATER_KIDS_PATH,
} from "@/lib/theaterKids";

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

  const kidsPreviewShows = useMemo(
    () => (kidsOnly ? [] : filterKidsShowsForHome(theaterShows ?? [], theaterPerformances).slice(0, 6)),
    [kidsOnly, theaterShows, theaterPerformances],
  );

  const filteredShows = useMemo(() => {
    const venueList = venues ?? [];
    const cityFilterReady = venues !== undefined;
    const base = kidsOnly ? upcomingShows.filter(isKidsTheaterShow) : upcomingShows;
    const filtered = base.filter((show) => {
      const perfs = performancesByShowSlug.get(show.slug) ?? [];
      return theaterShowMatchesListFilters(show, perfs, venueList, {
        region: regionFilter,
        fromYmd: appliedFrom,
        toYmd: appliedTo,
        cityFilterReady,
      });
    });
    // Παραγωγές με νέες παραστάσεις (τελευταίες 7 ημέρες) πρώτες.
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

  const hasShows = kidsOnly
    ? upcomingShows.some(isKidsTheaterShow)
    : upcomingShows.length > 0;
  const hasActiveFilters = regionFilter !== "all" || Boolean(appliedFrom || appliedTo);

  return (
    <div className={PAGE_LIST_SHELL_CLASS}>
      <PageListHeader>
        <h1 className={PAGE_LIST_TITLE_CLASS}>{kidsOnly ? "Παιδικές παραστάσεις" : "Θέατρο"}</h1>
        <p className={PAGE_LIST_SUBTITLE_CLASS}>
          {kidsOnly
            ? "Παιδικό θέατρο - πρόγραμμα, χώροι και ημερομηνίες για όλη την οικογένεια."
            : "Παραστάσεις, πρόγραμμα και ημερομηνίες - κάνε like σε ό,τι θες να δεις."}
        </p>
        {kidsOnly ? (
          <p className="mt-3">
            <Link to="/theater" className="text-sm font-medium text-white/70 underline-offset-2 hover:text-white hover:underline">
              ← Όλες οι παραστάσεις
            </Link>
          </p>
        ) : null}
      </PageListHeader>

      <div className="container mb-6">
        <TheaterLikePromo />
      </div>

      <div className="container">
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
            {!kidsOnly && kidsPreviewShows.length > 0 ? (
              <section className="mb-10" aria-labelledby="theater-kids-heading">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Για παιδιά</p>
                    <h2 id="theater-kids-heading" className="font-display text-xl font-bold text-foreground md:text-2xl">
                      Παιδικές παραστάσεις
                    </h2>
                  </div>
                  <Link
                    to={THEATER_KIDS_PATH}
                    className="text-sm font-semibold text-[#13143E] underline-offset-2 hover:underline"
                  >
                    Όλες οι παιδικές →
                  </Link>
                </div>
                <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {kidsPreviewShows.map((show, i) => {
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
                        badge={theaterShowListBadge(show, showPerformances) ?? "Παιδική"}
                      />
                    );
                  })}
                </div>
              </section>
            ) : null}

            {!kidsOnly ? (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold text-foreground md:text-xl">Όλες οι παραστάσεις</h2>
                <Link
                  to={THEATER_KIDS_PATH}
                  className="rounded-full border border-border/80 bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
                >
                  Παιδικές
                </Link>
              </div>
            ) : null}

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
                      (show.isKids ? "Παιδική" : undefined)
                    }
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default TheaterPage;
