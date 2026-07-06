import { cn } from "@/lib/utils";
import {
  THEATER_QUICK_DATE_OPTIONS,
  type TheaterQuickDateFilter,
} from "@/lib/theaterDateFilters";
import { THEATER_REGION_OPTIONS, type TheaterRegionFilter } from "@/lib/theaterRegionFilters";

const CHIP_CLASS = (active: boolean) =>
  cn(
    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
    active
      ? "border-[#13143E] bg-[#13143E] text-white"
      : "border-border/80 bg-background text-foreground hover:bg-muted/60",
  );

const DATE_INPUT_CLASS =
  "theater-filter-date h-10 w-full min-w-[9.5rem] rounded-md border border-input bg-background px-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

type Props = {
  regionFilter: TheaterRegionFilter;
  onRegionFilterChange: (value: TheaterRegionFilter) => void;
  draftFrom: string;
  draftTo: string;
  onDraftFromChange: (value: string) => void;
  onDraftToChange: (value: string) => void;
  onApply: () => void;
  onQuickFilter: (filter: TheaterQuickDateFilter) => void;
  activeQuickFilter: TheaterQuickDateFilter | null;
  className?: string;
};

export default function TheaterDateFilters({
  regionFilter,
  onRegionFilterChange,
  draftFrom,
  draftTo,
  onDraftFromChange,
  onDraftToChange,
  onApply,
  onQuickFilter,
  activeQuickFilter,
  className,
}: Props) {
  const hasDraft = Boolean(draftFrom || draftTo);

  return (
    <div className={cn("rounded-xl border border-border/70 bg-card/45 p-3 md:p-4", className)}>
      <div className="mb-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Πού</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Φίλτρο περιοχής">
          {THEATER_REGION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onRegionFilterChange(opt.value)}
              aria-pressed={regionFilter === opt.value}
              className={CHIP_CLASS(regionFilter === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Πότε</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Γρήγορο φίλτρο ημερομηνίας">
          {THEATER_QUICK_DATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onQuickFilter(opt.value)}
              aria-pressed={activeQuickFilter === opt.value}
              className={CHIP_CLASS(activeQuickFilter === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <div className="space-y-1.5">
          <label htmlFor="theater-filter-from" className="text-xs font-medium text-muted-foreground md:sr-only">
            Από
          </label>
          <div className="relative">
            <input
              id="theater-filter-from"
              type="date"
              value={draftFrom}
              onChange={(e) => onDraftFromChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onApply();
              }}
              onFocus={(e) => {
                const input = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
                input.showPicker?.();
              }}
              className={cn(DATE_INPUT_CLASS, !draftFrom && "theater-filter-date--empty")}
              aria-label="Από ημερομηνία"
            />
            {!draftFrom ? (
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/80">
                Από…
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="theater-filter-to" className="text-xs font-medium text-muted-foreground md:sr-only">
            Έως
          </label>
          <div className="relative">
            <input
              id="theater-filter-to"
              type="date"
              value={draftTo}
              onChange={(e) => onDraftToChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onApply();
              }}
              onFocus={(e) => {
                const input = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
                input.showPicker?.();
              }}
              className={cn(DATE_INPUT_CLASS, !draftTo && "theater-filter-date--empty")}
              aria-label="Έως ημερομηνία"
            />
            {!draftTo ? (
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/80">
                Έως…
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={onApply}
          className="inline-flex h-10 items-center justify-center rounded-md bg-[#13143E] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1a1b52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Εφαρμογή
        </button>

        {hasDraft ? (
          <button
            type="button"
            onClick={() => onQuickFilter("all")}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
          >
            Καθαρισμός
          </button>
        ) : null}
      </div>
    </div>
  );
}
