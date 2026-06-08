import { useMemo, type ReactNode } from "react";
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

const filterBtn =
  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all";
const filterBtnActive = "border-[#13143E] bg-[#13143E] text-white";
const filterBtnIdle =
  "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground";

function FilterButtonGroup({
  label,
  ariaLabel,
  children,
}: {
  label: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={ariaLabel}>
      <span className="w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:mr-1 sm:w-auto">
        {label}
      </span>
      {children}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(filterBtn, active ? filterBtnActive : filterBtnIdle)}
    >
      {children}
    </button>
  );
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
        <div className="mb-6 space-y-4 rounded-xl border border-border/15 bg-muted/20 p-4 md:mb-8 md:p-5">
          <FilterButtonGroup label="Πόλη" ariaLabel="Πόλη">
            {VENUE_AREA_FILTER_OPTIONS.filter((o) => o.value !== "other").map(({ value, label }) => (
              <FilterButton key={value} active={areaUi === value} onClick={() => setAreaUi(value)}>
                {label}
              </FilterButton>
            ))}
          </FilterButtonGroup>

          <FilterButtonGroup label="Τύπος" ariaLabel="Τύπος χώρου">
            {VENUE_KIND_FILTER_OPTIONS.map(({ value, label }) => (
              <FilterButton key={value} active={kindFilter === value} onClick={() => setKindUi(value)}>
                {label}
              </FilterButton>
            ))}
          </FilterButtonGroup>

          {areaUi === "athens" || areaUi === "all" ? (
            <FilterButtonGroup label="Περιοχή" ariaLabel="Περιοχή Αθήνας">
              {ATHENS_DISTRICT_FILTER_OPTIONS.map(({ value, label }) => (
                <FilterButton
                  key={value}
                  active={districtUi === value}
                  onClick={() => setDistrictUi(value)}
                >
                  {label}
                </FilterButton>
              ))}
            </FilterButtonGroup>
          ) : null}
        </div>

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
