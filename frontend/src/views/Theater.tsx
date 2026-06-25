import { useMemo, useState } from "react";
import EventCard from "@/components/EventCard";
import PageListHeader, { PAGE_LIST_SHELL_CLASS, PAGE_LIST_SUBTITLE_CLASS, PAGE_LIST_TITLE_CLASS } from "@/components/PageListHeader";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useTheaterShows, useTheaterPerformances } from "@/hooks/useStrapi";
import { theaterGenreLabel } from "@/lib/theaterGenre";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";
import { cn } from "@/lib/utils";
import { resolveTheaterTicketPrices, theaterPriceLabel } from "@/lib/theaterPricing";
import {
  performanceOverlapsDateRange,
  theaterPerformanceSummary,
  theaterShowHasUpcomingPerformances,
} from "@/lib/theaterPerformances";

function ymdToMs(ymd: string): number {
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return NaN;
  return new Date(y, m - 1, d).getTime();
}

function dateFilterMatch(
  show: { runStart?: string; runEnd?: string; slug: string },
  fromYmd: string,
  toYmd: string,
  performancesForShow: { datetime: string; scheduleKind?: "exact" | "week_block"; weekEnd?: string }[],
): boolean {
  if (!fromYmd && !toYmd) return true;
  if (performancesForShow.some((p) => performanceOverlapsDateRange(p, fromYmd, toYmd))) return true;
  const fromMs = fromYmd ? ymdToMs(fromYmd) : null;
  const toMs = toYmd ? ymdToMs(toYmd) : null;
  if ((fromMs != null && !Number.isFinite(fromMs)) || (toMs != null && !Number.isFinite(toMs))) return true;
  const showStart = show.runStart ? ymdToMs(show.runStart) : null;
  const showEnd = show.runEnd ? ymdToMs(show.runEnd) : null;
  const overlapStart = showStart ?? Number.NEGATIVE_INFINITY;
  const overlapEnd = showEnd ?? Number.POSITIVE_INFINITY;
  const filterStart = fromMs ?? Number.NEGATIVE_INFINITY;
  const filterEnd = toMs ?? Number.POSITIVE_INFINITY;
  return overlapStart <= filterEnd && overlapEnd >= filterStart;
}

const TheaterPage = () => {
  usePageSeo(staticPageSeo.theater);

  const { data: theaterShows, isLoading: showsLoading } = useTheaterShows();
  const { data: theaterPerformances, isLoading: performancesLoading } = useTheaterPerformances();
  const isLoading = showsLoading || performancesLoading;
  const [onlyTour, setOnlyTour] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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
    return upcomingShows.filter((show) => {
      if (onlyTour && !show.onTour) return false;
      const perfs = performancesByShowSlug.get(show.slug) ?? [];
      return dateFilterMatch(show, dateFrom, dateTo, perfs);
    });
  }, [upcomingShows, onlyTour, dateFrom, dateTo, performancesByShowSlug]);
  const hasShows = upcomingShows.length > 0;

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
            <div className="mb-6 rounded-xl border border-border/70 bg-card/45 p-3 md:p-4">
              <div className="mb-1 hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:flex md:items-center md:gap-3">
                <span className="md:min-w-[11rem]">Από</span>
                <span className="md:min-w-[11rem]">Έως</span>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
                <div>
                  <label className="flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={onlyTour}
                      onChange={(e) => setOnlyTour(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span>Μόνο περιοδείες</span>
                  </label>
                </div>
                <div>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      onFocus={(e) => {
                        const input = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
                        input.showPicker?.();
                      }}
                      className={cn(
                        "theater-filter-date h-10 w-full min-w-[9.5rem] rounded-md border border-border bg-background px-3 text-sm",
                        !dateFrom && "theater-filter-date--empty",
                      )}
                    />
                    {!dateFrom ? (
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/80">
                        Από..
                      </span>
                    ) : null}
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      onFocus={(e) => {
                        const input = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
                        input.showPicker?.();
                      }}
                      className={cn(
                        "theater-filter-date h-10 w-full min-w-[9.5rem] rounded-md border border-border bg-background px-3 text-sm",
                        !dateTo && "theater-filter-date--empty",
                      )}
                    />
                    {!dateTo ? (
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/80">
                        Έως..
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            {filteredShows.length === 0 ? (
              <p className="mb-6 text-sm text-muted-foreground">Δεν βρέθηκαν παραστάσεις με αυτά τα φίλτρα.</p>
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
