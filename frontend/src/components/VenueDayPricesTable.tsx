import type { StrapiVenue } from "@/lib/api";
import { formatEuroPrice, sortVenueDayPrices, venueWeekdayLabel } from "@/lib/venuePricing";

export function VenueDayPricesTable({ venue, className }: { venue: StrapiVenue; className?: string }) {
  const rows = sortVenueDayPrices(venue.dayPrices ?? []);
  if (!rows.length) return null;

  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Τιμές εισιτηρίων</p>
      <ul className="mt-1.5 space-y-1" role="list">
        {rows.map((row) => (
          <li key={row.weekday} className="flex items-baseline justify-between gap-3 text-xs sm:text-sm">
            <span className="text-muted-foreground">{venueWeekdayLabel(row.weekday)}</span>
            <span className="text-right tabular-nums text-foreground">
              <span className="font-medium">{formatEuroPrice(row.price)}</span>
              {row.priceStudent != null ? (
                <span className="block text-[11px] font-normal text-muted-foreground sm:text-xs">
                  Μειωμένο / φοιτητικό · {formatEuroPrice(row.priceStudent)}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
