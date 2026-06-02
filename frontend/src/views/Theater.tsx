import { useMemo, useState } from "react";
import EventCard from "@/components/EventCard";
import PageHeaderReveal from "@/components/PageHeaderReveal";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useTheaterShows } from "@/hooks/useStrapi";
import { theaterGenreLabel } from "@/lib/theaterGenre";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";
import { filterVisibleTheaterShows } from "@/lib/theaterRunDates";

type TourFilter = "all" | "tour" | "resident";

function ymdToMs(ymd: string): number {
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return NaN;
  return new Date(y, m - 1, d).getTime();
}

function dateFilterMatch(show: { runStart?: string; runEnd?: string }, fromYmd: string, toYmd: string): boolean {
  if (!fromYmd && !toYmd) return true;
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

  const { data: theaterShows, isLoading } = useTheaterShows();
  const [tourFilter, setTourFilter] = useState<TourFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const allShows = useMemo(() => filterVisibleTheaterShows(theaterShows ?? []), [theaterShows]);
  const filteredShows = useMemo(() => {
    return allShows.filter((show) => {
      if (tourFilter === "tour" && !show.onTour) return false;
      if (tourFilter === "resident" && show.onTour) return false;
      return dateFilterMatch(show, dateFrom, dateTo);
    });
  }, [allShows, tourFilter, dateFrom, dateTo]);
  const hasShows = allShows.length > 0;

  return (
    <div className="min-h-screen pt-36 pb-20 md:pb-8">
      <div className="section-black py-10 -mt-28 pt-36 mb-8">
        <div className="container">
          <PageHeaderReveal>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">Θέατρο</h1>
            <p className="text-white/60 text-base">Παραστάσεις, περιοδείες, πρόγραμμα και ημερομηνίες ανά παραγωγή.</p>
          </PageHeaderReveal>
        </div>
      </div>

      <div className="container">
        {isLoading ? (
          <LoadingState message="Φόρτωση παραστάσεων..." />
        ) : !hasShows ? (
          <p className="text-sm text-muted-foreground">
            Δεν υπάρχουν παραστάσεις προς το παρόν. Πρόσθεσέ τες στο CMS (Theater Show).
          </p>
        ) : (
          <>
            <div className="mb-6 rounded-xl border border-border/70 bg-card/45 p-3 md:p-4">
              <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Περιοδεία
                  </label>
                  <select
                    value={tourFilter}
                    onChange={(e) => setTourFilter(e.target.value as TourFilter)}
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="all">Όλα</option>
                    <option value="tour">Μόνο περιοδείες</option>
                    <option value="resident">Χωρίς περιοδεία</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Από
                  </label>
                  <input
                    type="text"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    inputMode="numeric"
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Έως
                  </label>
                  <input
                    type="text"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    inputMode="numeric"
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  />
                </div>
              </div>
            </div>
            {filteredShows.length === 0 ? (
              <p className="mb-6 text-sm text-muted-foreground">Δεν βρέθηκαν παραστάσεις με αυτά τα φίλτρα.</p>
            ) : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredShows.map((show, i) => (
                <EventCard
                  key={show.id}
                  slug={show.slug}
                  title={show.title}
                  subtitle={show.director}
                  genre={theaterGenreLabel(show.genre)}
                  duration={show.duration}
                  posterUrl={show.posterUrl}
                  type="theater"
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
              ))}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default TheaterPage;
