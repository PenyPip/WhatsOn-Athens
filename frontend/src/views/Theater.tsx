import { useCallback, useMemo, useState } from "react";
import EventCard from "@/components/EventCard";
import PageListHeader, { PAGE_LIST_SHELL_CLASS, PAGE_LIST_SUBTITLE_CLASS, PAGE_LIST_TITLE_CLASS } from "@/components/PageListHeader";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
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
  theaterShowHasUpcomingPerformances,
} from "@/lib/theaterPerformances";

const TheaterPage = () => {
  usePageSeo(staticPageSeo.theater);

  const { data: theaterShows, isLoading: showsLoading } = useTheaterShows();
  const { data: theaterPerformances, isLoading: performancesLoading } = useTheaterPerformances();
  const { data: venues } = useVenuesForProgram();
  const isLoading = showsLoading || performancesLoading;
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
    return upcomingShows.filter((show) => {
      const perfs = performancesByShowSlug.get(show.slug) ?? [];
      return theaterShowMatchesListFilters(show, perfs, venueList, {
        region: regionFilter,
        fromYmd: appliedFrom,
        toYmd: appliedTo,
        cityFilterReady,
      });
    });
  }, [upcomingShows, regionFilter, appliedFrom, appliedTo, performancesByShowSlug, venues]);

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

  const hasShows = upcomingShows.length > 0;
  const hasActiveFilters = regionFilter !== "all" || Boolean(appliedFrom || appliedTo);

  return (
    <div className={PAGE_LIST_SHELL_CLASS}>
      <PageListHeader>
        <h1 className={PAGE_LIST_TITLE_CLASS}>Θέατρο</h1>
        <p className={PAGE_LIST_SUBTITLE_CLASS}>
          Παραστάσεις, περιοδείες, πρόγραμμα και ημερομηνίες ανά παραγωγή.
        </p>
      </PageListHeader>

      <div className="container">
        {isLoading ? (
          <LoadingState message="Φόρτωση παραστάσεων..." />
        ) : !hasShows ? (
          <p className="text-sm text-muted-foreground">
            Δεν υπάρχουν παραστάσεις προς το παρόν.
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
                      show.soldOut
                        ? "SOLD OUT"
                        : show.isPremiere
                          ? "Πρεμιέρα"
                          : show.isLastShows
                            ? "Τελευταίες"
                            : undefined
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
