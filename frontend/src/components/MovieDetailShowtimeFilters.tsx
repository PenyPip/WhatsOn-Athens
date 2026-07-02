import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ATHENS_DISTRICT_LABELS,
  VENUE_AREA_LABELS,
  type AthensDistrictKey,
  type VenueAreaKey,
} from "@/lib/venueArea";
import {
  MOVIE_DETAIL_DAY_FILTER_OPTIONS,
  type MovieDetailDayFilter,
  type MovieDetailShowtimeFilterOptions,
} from "@/lib/movieDetailShowtimeFilters";

const FILTER_ALL = "__all__";

const FILTER_LABEL = "text-xs font-medium text-muted-foreground";
const FILTER_SELECT =
  "h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-background py-1.5 pl-3 pr-9 text-sm text-foreground shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

type Props = {
  dayFilter: MovieDetailDayFilter;
  onDayFilterChange: (value: MovieDetailDayFilter) => void;
  areaFilter: VenueAreaKey | null;
  onAreaFilterChange: (value: VenueAreaKey | null) => void;
  districtFilter: AthensDistrictKey | null;
  onDistrictFilterChange: (value: AthensDistrictKey | null) => void;
  options: MovieDetailShowtimeFilterOptions;
  className?: string;
};

export default function MovieDetailShowtimeFilters({
  dayFilter,
  onDayFilterChange,
  areaFilter,
  onAreaFilterChange,
  districtFilter,
  onDistrictFilterChange,
  options,
  className,
}: Props) {
  const showDayChips = options.dayFilters.length > 2;
  const showAreaSelect = options.areas.length > 1;
  const showDistrictSelect =
    (areaFilter === "athens" || (!areaFilter && options.areas.includes("athens"))) &&
    options.districts.length > 1;

  if (!showDayChips && !showAreaSelect && !showDistrictSelect) return null;

  const dayOptions = MOVIE_DETAIL_DAY_FILTER_OPTIONS.filter((o) => options.dayFilters.includes(o.value));

  return (
    <div className={cn("mb-4 space-y-3 md:mb-5", className)}>
      {showDayChips ? (
        <div className="space-y-1.5">
          <p className={FILTER_LABEL}>Πότε</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Φίλτρο ημέρας προβολών">
            {dayOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onDayFilterChange(opt.value)}
                aria-pressed={dayFilter === opt.value}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  dayFilter === opt.value
                    ? "border-[#13143E] bg-[#13143E] text-white"
                    : "border-border/80 bg-background text-foreground hover:bg-muted/60",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showAreaSelect || showDistrictSelect ? (
        <div className="flex flex-wrap items-end gap-2 sm:gap-3">
          {showAreaSelect ? (
            <div className="min-w-[9.5rem] flex-1 space-y-1.5 sm:max-w-[12rem]">
              <label htmlFor="movie-detail-filter-area" className={FILTER_LABEL}>
                Πόλη
              </label>
              <div className="relative">
                <select
                  id="movie-detail-filter-area"
                  value={areaFilter ?? FILTER_ALL}
                  onChange={(e) => {
                    const v = e.target.value;
                    onAreaFilterChange(v === FILTER_ALL ? null : (v as VenueAreaKey));
                    if (v !== "athens") onDistrictFilterChange(null);
                  }}
                  className={FILTER_SELECT}
                  aria-label="Πόλη προβολών"
                >
                  <option value={FILTER_ALL}>Όλες</option>
                  {options.areas.map((key) => (
                    <option key={key} value={key}>
                      {VENUE_AREA_LABELS[key]}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
              </div>
            </div>
          ) : null}

          {showDistrictSelect ? (
            <div className="min-w-[11rem] flex-1 space-y-1.5 sm:max-w-[15rem]">
              <label htmlFor="movie-detail-filter-district" className={FILTER_LABEL}>
                Περιοχή
              </label>
              <div className="relative">
                <select
                  id="movie-detail-filter-district"
                  value={districtFilter ?? FILTER_ALL}
                  onChange={(e) => {
                    const v = e.target.value;
                    onDistrictFilterChange(v === FILTER_ALL ? null : (v as AthensDistrictKey));
                  }}
                  className={FILTER_SELECT}
                  aria-label="Περιοχή Αθήνας"
                >
                  <option value={FILTER_ALL}>Όλη η Αθήνα</option>
                  {options.districts.map((key) => (
                    <option key={key} value={key}>
                      {ATHENS_DISTRICT_LABELS[key]}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
