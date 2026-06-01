import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeaderReveal from "@/components/PageHeaderReveal";
import VenueCard from "@/components/VenueCard";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useShowtimes, useVenues } from "@/hooks/useStrapi";
import { buildVenueShowtimeRangeMap, formatVenueShowtimeRangeLabel } from "@/lib/venueShowtimeRange";
import { isCinemaVenue, isPublicVenueListing } from "@/lib/venueType";
import {
  ATHENS_DISTRICT_FILTER_OPTIONS,
  ATHENS_DISTRICT_LABELS,
  isAthensVenue,
  parseVenueDistrictParam,
  venueMatchesDistrictFilter,
  type AthensDistrictFilter,
  type AthensDistrictKey,
} from "@/lib/venueArea";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";
import { cn } from "@/lib/utils";

function activeDistrictFilter(
  districtParam: AthensDistrictKey | null,
): AthensDistrictFilter {
  return districtParam ?? "all";
}

const Venues = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const districtFilter = parseVenueDistrictParam(searchParams.get("district"));
  const districtUi = activeDistrictFilter(districtFilter);
  const hasListFilter = districtFilter !== null;

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

  const setDistrictUi = (next: AthensDistrictFilter) => {
    const params = new URLSearchParams(searchParams);
    params.delete("type");
    params.delete("area");
    if (next === "all") params.delete("district");
    else params.set("district", next);
    setSearchParams(params);
  };

  const filteredVenues = useMemo(() => {
    return [...(venues ?? [])]
      .filter(isPublicVenueListing)
      .filter(isAthensVenue)
      .filter((v) => venueMatchesDistrictFilter(v, districtFilter))
      .sort((a, b) => a.name.localeCompare(b.name, "el"));
  }, [venues, districtFilter]);

  return (
    <div className="min-h-screen pt-36 pb-20 md:pb-8">
      <div className="section-black py-10 -mt-28 pt-36 mb-8">
        <div className="container">
          <PageHeaderReveal>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">Χώροι</h1>
            <p className="text-white/50 text-sm">Σινεμά & θερινά στην Αθήνα — ανά περιοχή</p>
          </PageHeaderReveal>
        </div>
      </div>

      <div className="container">
        <div
          className="mb-6 flex flex-wrap items-center gap-2 md:mb-8"
          role="group"
          aria-label="Περιοχή Αθήνας"
        >
          <span className="mr-1 w-full text-sm uppercase tracking-wider text-muted-foreground sm:w-auto">
            Περιοχή:
          </span>
          {ATHENS_DISTRICT_FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDistrictUi(value)}
              aria-pressed={districtUi === value}
              className={cn(
                "rounded border px-4 py-1.5 text-sm font-medium transition-all",
                districtUi === value
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
            {districtFilter
              ? `Δεν βρέθηκαν σινεμά στην περιοχή «${ATHENS_DISTRICT_LABELS[districtFilter]}».`
              : "Δεν υπάρχουν καταχωρημένα σινεμά στην Αθήνα προς το παρόν."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredVenues.map((venue, i) => (
              <div
                key={venue.id}
                className="h-full animate-stagger-in [&>div]:max-w-none"
                style={{ ["--stagger" as string]: Math.min(i, 8) }}
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
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Venues;
