import { useMemo } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import VenueCard from "@/components/VenueCard";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useShowtimes, useVenues } from "@/hooks/useStrapi";
import { buildVenueShowtimeRangeMap, formatVenueShowtimeRangeLabel } from "@/lib/venueShowtimeRange";
import { isCinemaVenue } from "@/lib/venueType";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";
import { cn } from "@/lib/utils";
import {
  VENUE_KIND_FILTER_OPTIONS,
  parseVenueKindFilterParam,
  venueMatchesKindFilter,
  type VenueKindFilter,
} from "@/lib/venueType";

const Venues = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const kindFilter = parseVenueKindFilterParam(searchParams.get("type"));
  const hasListFilter = kindFilter !== "all";

  usePageSeo({
    ...staticPageSeo.venues,
    noIndex: hasListFilter,
  });

  const { data: venues, isLoading } = useVenues();
  const { data: showtimes, isLoading: showtimesLoading } = useShowtimes();

  const showtimeRanges = useMemo(
    () => buildVenueShowtimeRangeMap(venues ?? [], showtimes ?? []),
    [venues, showtimes],
  );

  const setKindFilter = (next: VenueKindFilter) => {
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("type");
    else params.set("type", next);
    setSearchParams(params);
  };

  const filteredVenues = useMemo(() => {
    return [...(venues ?? [])]
      .filter((v) => venueMatchesKindFilter(v, kindFilter))
      .sort((a, b) => a.name.localeCompare(b.name, "el"));
  }, [venues, kindFilter]);

  return (
    <div className="min-h-screen pt-36 pb-20 md:pb-8">
      <div className="section-black py-10 -mt-28 pt-36 mb-8">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">Χώροι</h1>
            <p className="text-white/50 text-sm">Σινεμά, θέατρα & μουσικές σκηνές</p>
          </motion.div>
        </div>
      </div>

      <div className="container">
        <div
          className="mb-6 flex flex-wrap items-center gap-2 md:mb-8"
          role="group"
          aria-label="Φίλτρο τύπου χώρου"
        >
          <span className="mr-1 text-sm uppercase tracking-wider text-muted-foreground">Τύπος:</span>
          {VENUE_KIND_FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setKindFilter(value)}
              aria-pressed={kindFilter === value}
              className={cn(
                "rounded border px-4 py-1.5 text-sm font-medium transition-all",
                kindFilter === value
                  ? "border-[#13143E] bg-[#13143E] text-white"
                  : "border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingState message="Φόρτωση χώρων..." />
        ) : filteredVenues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {kindFilter === "all"
              ? "Δεν υπάρχουν καταχωρημένοι χώροι προς το παρόν."
              : kindFilter === "cinema"
                ? "Δεν βρέθηκαν σινεμά για αυτό το φίλτρο."
                : "Δεν βρέθηκαν θέατρα για αυτό το φίλτρο."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredVenues.map((venue, i) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.08, 0.4) }}
                className="h-full [&>div]:max-w-none"
              >
                <VenueCard
                  venue={venue}
                  layout="grid"
                  variant="page"
                  showProgramDates={isCinemaVenue(venue)}
                  programDatesLoading={showtimesLoading}
                  programDatesLabel={
                    isCinemaVenue(venue)
                      ? formatVenueShowtimeRangeLabel(showtimeRanges.get(venue.id) ?? null)
                      : undefined
                  }
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Venues;
