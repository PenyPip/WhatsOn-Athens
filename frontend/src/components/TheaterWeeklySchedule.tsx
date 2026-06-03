import { CalendarClock } from "lucide-react";
import type { TheaterWeeklySlot } from "@/lib/api";
import { cn } from "@/lib/utils";
import { groupTheaterWeeklySchedule } from "@/lib/theaterSchedule";
import TheaterTicketPrices from "@/components/TheaterTicketPrices";
import type { StrapiTheaterShow } from "@/lib/api";

type TheaterWeeklyScheduleProps = {
  show: Pick<StrapiTheaterShow, "weeklySchedule" | "ticketPrice" | "ticketPriceFrom" | "ticketPriceTo">;
  /** Συμπαγές πλέγμα (λιγότερο padding) */
  compact?: boolean;
  className?: string;
  id?: string;
};

export default function TheaterWeeklySchedule({
  show,
  compact = false,
  className,
  id,
}: TheaterWeeklyScheduleProps) {
  const days = groupTheaterWeeklySchedule(show.weeklySchedule ?? []);
  if (!days.length) return null;

  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 rounded-xl border border-border/80 bg-gradient-to-b from-card/80 to-card/40",
        compact ? "p-4" : "p-4 md:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2.5">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-[#13143E]/70" aria-hidden />
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground md:text-xl">Πρόγραμμα</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Σταθερές μέρες και ώρες παράστασης</p>
          </div>
        </div>
        <TheaterTicketPrices show={show} variant="inline" className="sm:max-w-xs sm:justify-end" />
      </div>

      <div
        className={cn(
          "mt-4 grid gap-2",
          days.length <= 4
            ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7",
        )}
        role="list"
      >
        {days.map((day) => (
          <div
            key={day.weekday}
            role="listitem"
            className="flex flex-col rounded-lg border border-border/70 bg-background/80 px-3 py-2.5 shadow-sm"
          >
            <p className="font-display text-sm font-semibold leading-tight text-foreground">{day.label}</p>
            <ul className="mt-2 flex flex-col gap-1.5" aria-label={`Ώρες ${day.label}`}>
              {day.times.map((time) => (
                <li key={`${day.weekday}-${time}`}>
                  <span className="inline-flex w-full items-center justify-center rounded-md bg-[#13143E]/[0.07] px-2 py-1.5 text-sm font-semibold tabular-nums text-[#13143E]">
                    {time}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Μίνι προεπισκόπηση για hero (τιμές + σύντομο πρόγραμμα). */
export function TheaterScheduleHeroPreview({
  show,
  className,
}: {
  show: Pick<StrapiTheaterShow, "weeklySchedule" | "ticketPrice" | "ticketPriceFrom" | "ticketPriceTo">;
  className?: string;
}) {
  const days = groupTheaterWeeklySchedule(show.weeklySchedule ?? []);
  const hasSchedule = days.length > 0;
  const hasPrices =
    show.ticketPriceFrom != null || show.ticketPriceTo != null || show.ticketPrice != null;

  if (!hasSchedule && !hasPrices) return null;

  return (
    <div className={cn("mt-4 space-y-3", className)}>
      <TheaterTicketPrices show={show} variant="hero" />
      {hasSchedule ? (
        <div className="flex flex-wrap gap-2 pb-1">
          {days.map((day) =>
            day.times.map((time) => (
              <span
                key={`${day.weekday}-${time}`}
                className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90"
              >
                <span className="text-white/60">{day.shortLabel}</span>
                <span className="tabular-nums font-semibold">{time}</span>
              </span>
            )),
          )}
          <a
            href="#theater-schedule"
            className="inline-flex items-center rounded-full border border-white/25 px-2.5 py-1 text-xs font-medium text-amber-100/90 transition-colors hover:bg-white/10"
          >
            Όλο το πρόγραμμα
          </a>
        </div>
      ) : null}
    </div>
  );
}
