import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeaderReveal from "@/components/PageHeaderReveal";
import VenueCard from "@/components/VenueCard";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useShowtimes, useVenues } from "@/hooks/useStrapi";
import { buildVenueShowtimeRangeMap, formatVenueShowtimeRangeLabel } from "@/lib/venueShowtimeRange";
import {
  isCinemaVenue,
  isPublicVenueListing,
  parseVenueKindFilterParam,
  venueMatchesKindFilter,
  VENUE_KIND_FILTER_OPTIONS,
  type VenueKindFilter,
} from "@/lib/venueType";
import {
  ATHENS_DISTRICT_FILTER_OPTIONS,
  ATHENS_DISTRICT_LABELS,
  parseVenueAreaParam,
  parseVenueDistrictParam,
  VENUE_AREA_FILTER_OPTIONS,
  venueMatchesAreaFilter,
  venueMatchesDistrictFilter,
  type AthensDistrictFilter,
  type AthensDistrictKey,
  type VenueAreaFilter,
  type VenueAreaKey,
} from "@/lib/venueArea";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";
import { cn } from "@/lib/utils";

function activeDistrictFilter(
  districtParam: AthensDistrictKey | null,
): AthensDistrictFilter {
  return districtParam ?? "all";
}

function activeAreaFilter(areaParam: VenueAreaKey | null): VenueAreaFilter {
  return areaParam ?? "athens";
}

const Venues = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const areaFilter = parseVenueAreaParam(searchParams.get("area"));
  const areaUi = activeAreaFilter(areaFilter);
  const districtFilter = parseVenueDistrictParam(searchParams.get("district"));
  const districtUi = activeDistrictFilter(districtFilter);
  const kindFilter = parseVenueKindFilterParam(searchParams.get("type"));
  const hasListFilter = areaFilter !== null || districtFilter !== null || kindFilter !== "all";

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

  const setAreaUi = (next: VenueAreaFilter) => {
    const params = new URLSearchParams(searchParams);
    if (next === "all" || next === "athens") params.delete("area");
    else params.set("area", next);
    if (next !== "athens" && next !== "all") params.delete("district");
    setSearchParams(params);
  };

  const setDistrictUi = (next: AthensDistrictFilter) => {
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("district");
    else params.set("district", next);
    setSearchParams(params);
  };

  const setKindUi = (next: VenueKindFilter) => {
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("type");
    else params.set("type", next);
    setSearchParams(params);
  };

  const filteredVenues = useMemo(() => {
    const areaKey: VenueAreaKey | null =
      areaUi === "all" ? null : areaUi === "athens" && !areaFilter ? "athens" : areaFilter;
    return [...(venues ?? [])]
      .filter(isPublicVenueListing)
      .filter((v) => venueMatchesAreaFilter(v, areaKey))
      .filter((v) => venueMatchesKindFilter(v, kindFilter))
      .filter((v) => venueMatchesDistrictFilter(v, districtFilter))
      .sort((a, b) => a.name.localeCompare(b.name, "el"));
  }, [venues, areaFilter, areaUi, districtFilter, kindFilter]);

  return (
    <div className="min-h-screen pt-36 pb-20 md:pb-8">
      <div className="section-black py-10 -mt-28 pt-36 mb-8">
        <div className="container">
          <PageHeaderReveal>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">Χώροι</h1>
            <p className="text-white/50 text-sm">
              Σινεμά, θέατρα και άλλοι πολιτιστικοί χώροι — Αθήνα, Θεσσαλονίκη και αλλού
            </p>
          </PageHeaderReveal>
        </div>
      </div>

      <div className="container">
        <div
          className="mb-4 flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Πόλη"
        >
          <span className="mr-1 w-full text-sm uppercase tracking-wider text-muted-foreground sm:w-auto">
            Πόλη:
          </span>
          {VENUE_AREA_FILTER_OPTIONS.filter((o) => o.value !== "other").map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setAreaUi(value)}
              aria-pressed={areaUi === value}
              className={cn(
                "rounded border px-4 py-1.5 text-sm font-medium transition-all",
                areaUi === value
                  ? "border-[#13143E] bg-[#13143E] text-white"
                  : "border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          className="mb-4 flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Τύπος χώρου"
        >
          <span className="mr-1 w-full text-sm uppercase tracking-wider text-muted-foreground sm:w-auto">
            Τύπος:
          </span>
          {VENUE_KIND_FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setKindUi(value)}
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

        {areaUi === "athens" || areaUi === "all" ? (
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
        ) : null}

        {isLoading ? (
          <LoadingState message="Φόρτωση χώρων..." />
        ) : filteredVenues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {areaFilter || districtFilter || kindFilter !== "all"
              ? "Δεν βρέθηκαν χώροι με αυτά τα κριτήρια."
              : "Δεν υπάρχουν καταχωρημένοι χώροι προς το παρόν."}
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
