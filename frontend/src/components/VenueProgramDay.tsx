import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PosterPicture from "@/components/PosterPicture";
import type { StrapiMovie } from "@/lib/api";
import {
  endOfCinemaWeek,
  formatCinemaWeekHeading,
  startOfCinemaWeek,
} from "@/lib/homeMovieFilters";
import { movieTitleLines, posterAltForMovie } from "@/lib/movieTitles";
import SummerScreeningIndicator from "@/components/SummerScreeningIndicator";
import VenueBookingLink from "@/components/VenueBookingLink";
import { isValidExternalUrl } from "@/lib/venueResolve";
import type { StrapiVenue } from "@/lib/api";
import { cn } from "@/lib/utils";
import { eachDayInclusiveInRange } from "@/lib/showtimeSchedule";

type ShowingSlot = {
  datetime: Date;
  hallName?: string;
  summerScreening?: boolean;
  timesTba?: boolean;
  weekRangeLabel?: string;
  weekRangeEnd?: Date;
};

type VenueShowingsBlock = {
  key: string;
  venueLabel: string;
  slots: ShowingSlot[];
};

export type VenueProgramDayEntry = {
  movie: StrapiMovie;
  showings: VenueShowingsBlock[];
};

export type VenueProgramSection = {
  label: string;
  date: Date;
  entries: VenueProgramDayEntry[];
};

type ShowingRow = {
  key: string;
  datetime: Date;
  hallName?: string;
  summerScreening?: boolean;
  timesTba?: boolean;
  weekRangeLabel?: string;
};

type ProgramLine = {
  key: string;
  datetime: Date;
  hallName?: string;
  summerScreening?: boolean;
  timesTba?: boolean;
  weekRangeLabel?: string;
  movie: StrapiMovie;
};

type ProgramDayGroup = {
  dayKey: string;
  date: Date;
  weekdayShort: string;
  dayNumber: number;
  monthShort: string;
  lines: ProgramLine[];
};

type ProgramWeekGroup = {
  weekKey: string;
  weekStart: Date;
  weekEnd: Date;
  heading: string;
  days: ProgramDayGroup[];
};

const WEEKDAY_SHORT_EL = ["Κυρ", "Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ"] as const;

function flattenShowingsToRows(showings: VenueShowingsBlock[]): ShowingRow[] {
  const rows: ShowingRow[] = [];
  for (const b of showings) {
    const slots = [...b.slots].sort((x, y) => x.datetime.getTime() - y.datetime.getTime());
    for (const slot of slots) {
      if (slot.timesTba && slot.weekRangeEnd) {
        for (const day of eachDayInclusiveInRange(slot.datetime, slot.weekRangeEnd)) {
          rows.push({
            key: `${b.key}-tba-${day.getTime()}-${slot.hallName ?? ""}`,
            datetime: day,
            hallName: slot.hallName,
            summerScreening: slot.summerScreening,
            timesTba: true,
          });
        }
        continue;
      }
      rows.push({
        key: `${b.key}-${slot.datetime.getTime()}-${slot.hallName ?? ""}`,
        datetime: slot.datetime,
        hallName: slot.hallName,
        summerScreening: slot.summerScreening,
        timesTba: slot.timesTba,
        weekRangeLabel: slot.weekRangeLabel,
      });
    }
  }
  return rows.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function isTodayCalendarDay(d: Date, now: Date): boolean {
  return calendarDayKey(d) === calendarDayKey(now);
}

function calendarDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfToday(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isPastCalendarDay(d: Date, now: Date): boolean {
  return d.getTime() < startOfToday(now).getTime();
}

function buildDayMeta(d: Date): Omit<ProgramDayGroup, "dayKey" | "lines"> {
  const monthShort = d.toLocaleDateString("el-GR", { month: "short" }).replace(/\.$/, "");
  return {
    date: d,
    weekdayShort: WEEKDAY_SHORT_EL[d.getDay()],
    dayNumber: d.getDate(),
    monthShort,
  };
}

/** Στήλες Πέμπτη–Τετάρτη · μόνο σήμερα και μελλοντικές ημέρες. */
function buildCinemaWeekColumns(weekStart: Date, filledDays: Map<string, ProgramLine[]>, now: Date): ProgramDayGroup[] {
  const columns: ProgramDayGroup[] = [];
  const todayStart = startOfToday(now);
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
    if (d.getTime() < todayStart.getTime()) continue;
    const dayKey = calendarDayKey(d);
    columns.push({
      dayKey,
      ...buildDayMeta(d),
      lines: filledDays.get(dayKey) ?? [],
    });
  }
  return columns;
}

function groupProgramByCinemaWeek(lines: ProgramLine[], now: Date): ProgramWeekGroup[] {
  const byWeek = new Map<string, ProgramLine[]>();
  for (const line of lines) {
    const weekStart = startOfCinemaWeek(line.datetime);
    const weekKey = calendarDayKey(weekStart);
    if (!byWeek.has(weekKey)) byWeek.set(weekKey, []);
    byWeek.get(weekKey)!.push(line);
  }

  const todayStart = startOfToday(now);

  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekKey, weekLines]) => {
      const sorted = [...weekLines]
        .filter((line) => line.datetime.getTime() >= todayStart.getTime())
        .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
      if (!sorted.length) return null;

      const weekStart = startOfCinemaWeek(sorted[0].datetime);
      const weekEnd = endOfCinemaWeek(sorted[0].datetime);

      const byDay = new Map<string, ProgramLine[]>();
      for (const line of sorted) {
        const dayKey = calendarDayKey(line.datetime);
        if (!byDay.has(dayKey)) byDay.set(dayKey, []);
        byDay.get(dayKey)!.push(line);
      }

      const days = buildCinemaWeekColumns(weekStart, byDay, now);
      if (!days.length) return null;

      return {
        weekKey,
        weekStart,
        weekEnd,
        heading: formatCinemaWeekHeading(weekStart, weekEnd, now),
        days,
      };
    })
    .filter((w): w is ProgramWeekGroup => w !== null);
}

function VenueMoviePoster({ movie, index }: { movie: StrapiMovie; index: number }) {
  const tl = movieTitleLines(movie);
  const alt = posterAltForMovie(movie);

  return (
    <div className="animate-stagger-in" style={{ ["--stagger" as string]: Math.min(index, 6) }}>
      <Link
        to={`/movies/${movie.slug}`}
        className="group block min-w-0"
        title={tl.secondary ? `${tl.primary} (${tl.secondary})` : tl.primary}
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-muted ring-1 ring-border/15 transition-[box-shadow,ring-color] group-hover:ring-[#13143E]/25 group-hover:shadow-md">
          {movie.posterUrl ? (
            <PosterPicture
              src={movie.posterUrl}
              srcSet={movie.posterSrcSet}
              alt={alt}
              width={200}
              height={300}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-[10px] font-medium text-muted-foreground">
              {tl.primary}
            </div>
          )}
          {movie.isDubbed ? (
            <span className="absolute right-1 top-1 rounded bg-amber-600/95 px-1 py-0.5 text-[8px] font-bold uppercase text-white">
              Μεταγλ.
            </span>
          ) : null}
        </div>
        <p className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-tight text-foreground group-hover:text-primary sm:text-xs">
          {tl.primary}
        </p>
      </Link>
    </div>
  );
}

function VenueCalendarScreening({
  line,
  inlineTime = false,
}: {
  line: ProgramLine;
  inlineTime?: boolean;
}) {
  const tl = movieTitleLines(line.movie);
  return (
    <div className="rounded-md border-l-[3px] border-l-[#13143E] bg-background py-2 pl-2.5 pr-2 shadow-sm ring-1 ring-border/20 transition-shadow hover:ring-[#13143E]/25">
      {inlineTime ? (
        <div className="mb-1 text-xs font-bold leading-none text-[#13143E] sm:text-sm">
          {line.timesTba ? (line.weekRangeLabel ? `${line.weekRangeLabel} · ώρες σύντομα` : "Ώρες σύντομα") : formatClock(line.datetime)}
        </div>
      ) : null}
      <div className="flex items-center gap-1">
        <Link
          to={`/movies/${line.movie.slug}`}
          className="min-w-0 text-xs font-medium leading-snug text-foreground hover:text-primary hover:underline sm:text-sm"
        >
          {tl.primary}
        </Link>
        {line.summerScreening ? <SummerScreeningIndicator iconClassName="h-3 w-3" /> : null}
      </div>
      {line.hallName ? (
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-xs">{line.hallName}</p>
      ) : null}
    </div>
  );
}

function timeSlotKey(line: ProgramLine): string {
  if (line.timesTba) return "tba";
  return formatClock(line.datetime);
}

function timeSlotLabel(slotKey: string): string {
  if (slotKey === "tba") return "Ώρες σύντομα";
  return slotKey;
}

function sortTimeSlotKeys(keys: string[]): string[] {
  const regular = keys.filter((k) => k !== "tba").sort((a, b) => a.localeCompare(b, "el"));
  return keys.includes("tba") ? [...regular, "tba"] : regular;
}

/** Επικεφαλίδα ημέρας — στοίχιση αριστερά μέσα στη στήλη του οριζόντιου ημερολογίου. */
function VenueDayHeader({ day, isToday }: { day: ProgramDayGroup; isToday: boolean }) {
  return (
    <header
      className={cn(
        "flex w-full shrink-0 flex-col items-start gap-0.5 border-b px-2.5 py-2.5 text-left sm:px-3",
        isToday ? "border-[#13143E]/25 bg-[#13143E]/[0.08]" : "border-border/15 bg-muted/35",
      )}
    >
      <span
        className={cn(
          "text-[10px] font-bold uppercase tracking-wide",
          isToday ? "text-[#13143E]" : "text-muted-foreground",
        )}
      >
        {day.weekdayShort}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-xl font-bold tabular-nums leading-none text-foreground sm:text-2xl">
          {day.dayNumber}
        </span>
        <span className="text-[10px] capitalize text-muted-foreground sm:text-[11px]">{day.monthShort}</span>
      </div>
    </header>
  );
}

function VenueCalendarCell({
  lines,
  isToday,
  inlineTime = false,
}: {
  lines: ProgramLine[];
  isToday: boolean;
  inlineTime?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-h-[5.25rem] p-2",
        isToday && "bg-[#13143E]/[0.03]",
      )}
    >
      {lines.length > 0 ? (
        <div className="flex flex-col gap-2">
          {lines.map((line) => (
            <VenueCalendarScreening key={line.key} line={line} inlineTime={inlineTime} />
          ))}
        </div>
      ) : (
        <p className="py-3 text-left text-[10px] text-muted-foreground/45"> </p>
      )}
    </div>
  );
}

function VenueProgramCalendarWeek({ week, now }: { week: ProgramWeekGroup; now: Date }) {
  const slotKeys = useMemo(() => {
    const all = week.days.flatMap((day) => day.lines.map((line) => timeSlotKey(line)));
    return sortTimeSlotKeys([...new Set(all)]);
  }, [week.days]);

  const linesByDayAndSlot = useMemo(() => {
    const m = new Map<string, ProgramLine[]>();
    for (const day of week.days) {
      for (const line of day.lines) {
        const k = `${day.dayKey}|${timeSlotKey(line)}`;
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push(line);
      }
    }
    return m;
  }, [week.days]);

  return (
    <article className="overflow-hidden rounded-xl border border-border/20 bg-card/40 shadow-sm">
      <header className="border-b border-border/15 bg-muted/25 px-4 py-3 text-left md:px-5">
        <h3 className="font-display text-base font-semibold leading-snug text-foreground md:text-lg">
          {week.heading}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">Εβδομαδιαίο ημερολόγιο προβολών</p>
      </header>

      <div className="overflow-x-auto overscroll-x-contain">
        <div className="min-w-max lg:min-w-0 lg:w-full lg:hidden">
          <div
            className="grid border-b border-border/20 bg-muted/25"
            style={{ gridTemplateColumns: `repeat(${week.days.length}, minmax(6.25rem, 1fr))` }}
          >
            {week.days.map((day) => (
              <div key={`m-head-${day.dayKey}`} className="border-r border-border/20 last:border-r-0">
                <VenueDayHeader day={day} isToday={isTodayCalendarDay(day.date, now)} />
              </div>
            ))}
          </div>

          {slotKeys.map((slotKey) => (
            <div
              key={`m-slot-${week.weekKey}-${slotKey}`}
              className="grid border-b border-border/20 last:border-b-0"
              style={{ gridTemplateColumns: `repeat(${week.days.length}, minmax(6.25rem, 1fr))` }}
            >
              {week.days.map((day) => {
                const key = `${day.dayKey}|${slotKey}`;
                return (
                  <div key={`m-cell-${day.dayKey}-${slotKey}`} className="border-r border-border/20 last:border-r-0">
                    <VenueCalendarCell
                      lines={linesByDayAndSlot.get(key) ?? []}
                      isToday={isTodayCalendarDay(day.date, now)}
                      inlineTime
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="hidden min-w-max lg:w-full lg:block">
          <div
            className="grid border-b border-border/20 bg-muted/25"
            style={{ gridTemplateColumns: `5.5rem repeat(${week.days.length}, minmax(6.25rem, 1fr))` }}
          >
            <div className="sticky left-0 z-20 border-r border-border/20 bg-muted/25 px-2 py-2 text-xs font-semibold uppercase text-muted-foreground">
              Ώρα
            </div>
            {week.days.map((day) => (
              <div key={`head-${day.dayKey}`} className="border-r border-border/20 last:border-r-0">
                <VenueDayHeader day={day} isToday={isTodayCalendarDay(day.date, now)} />
              </div>
            ))}
          </div>

          {slotKeys.map((slotKey) => (
            <div
              key={`slot-${week.weekKey}-${slotKey}`}
              className="grid border-b border-border/20 last:border-b-0"
              style={{ gridTemplateColumns: `5.5rem repeat(${week.days.length}, minmax(6.25rem, 1fr))` }}
            >
              <div className="sticky left-0 z-10 border-r border-border/20 bg-card/95 px-2 py-3 text-sm font-semibold text-[#13143E] backdrop-blur-[1px]">
                {timeSlotLabel(slotKey)}
              </div>
              {week.days.map((day) => {
                const key = `${day.dayKey}|${slotKey}`;
                return (
                  <div key={`cell-${day.dayKey}-${slotKey}`} className="border-r border-border/20 last:border-r-0">
                    <VenueCalendarCell
                      lines={linesByDayAndSlot.get(key) ?? []}
                      isToday={isTodayCalendarDay(day.date, now)}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

/** Σελίδα προγράμματος χώρου: ταινίες πάνω, ημερολόγιο κάτω (Πέμπτη – Τετάρτη). */
export default function VenueProgramLayout({
  sections,
  venue,
}: {
  sections: VenueProgramSection[];
  venue?: StrapiVenue;
}) {
  const now = useMemo(() => new Date(), []);
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [showAllWeeks, setShowAllWeeks] = useState(false);

  const { availableMovies, programWeeks, totalLines } = useMemo(() => {
    const allEntries = sections.flatMap((s) => s.entries);

    const programLines: ProgramLine[] = allEntries
      .flatMap(({ movie, showings }) =>
        flattenShowingsToRows(showings).map((row) => ({
          key: `${movie.id}-${row.key}`,
          datetime: row.datetime,
          hallName: row.hallName,
          summerScreening: row.summerScreening,
          timesTba: row.timesTba,
          weekRangeLabel: row.weekRangeLabel,
          movie,
        })),
      )
      .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

    const unfilteredWeeks = groupProgramByCinemaWeek(programLines, now);
    const movieIdsInProgram = new Set<number>();
    for (const week of unfilteredWeeks) {
      for (const day of week.days) {
        for (const line of day.lines) movieIdsInProgram.add(line.movie.id);
      }
    }
    const movies = [...new Map(allEntries.map((e) => [e.movie.id, e.movie])).values()]
      .filter((m) => movieIdsInProgram.has(m.id))
      .sort((a, b) => movieTitleLines(a).primary.localeCompare(movieTitleLines(b).primary, "el"));

    const filteredLines = programLines.filter((line) =>
      selectedMovieId != null ? line.movie.id === selectedMovieId : true,
    );

    return {
      availableMovies: movies,
      programWeeks: groupProgramByCinemaWeek(filteredLines, now),
      totalLines: filteredLines.length,
    };
  }, [sections, now, selectedMovieId]);

  useEffect(() => {
    if (selectedMovieId != null && !availableMovies.some((m) => m.id === selectedMovieId)) {
      setSelectedMovieId(null);
    }
  }, [selectedMovieId, availableMovies]);

  useEffect(() => {
    setShowAllWeeks(false);
  }, [selectedMovieId]);

  const hasActiveFilters = selectedMovieId != null;
  const selectedMovie = selectedMovieId != null ? availableMovies.find((m) => m.id === selectedMovieId) ?? null : null;
  const visibleWeeks = showAllWeeks ? programWeeks : programWeeks.slice(0, 2);
  const hiddenWeeks = Math.max(0, programWeeks.length - visibleWeeks.length);

  if (!availableMovies.length && !programWeeks.length) return null;

  return (
    <div className="space-y-10 md:space-y-12">
      {availableMovies.length > 0 ? (
        <section>
          <h2 className="font-display mb-3 text-lg font-semibold md:mb-4 md:text-2xl">Ταινίες</h2>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8">
            {availableMovies.map((movie, i) => (
              <VenueMoviePoster key={movie.id} movie={movie} index={i} />
            ))}
          </div>
        </section>
      ) : null}

      {availableMovies.length > 0 ? (
        <section id="venue-program" className="scroll-mt-28 space-y-5 md:space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold md:text-2xl">Πρόγραμμα</h2>
              <p className="mt-1 text-sm text-muted-foreground">Εβδομαδιαίο ημερολόγιο προβολών</p>
              <p className="mt-1 text-xs text-muted-foreground">Εμφανίζονται {totalLines} προβολές</p>
            </div>
            {venue && isValidExternalUrl(venue.moreLink) ? (
              <VenueBookingLink venue={venue} variant="button" className="shrink-0" />
            ) : null}
          </div>
          <div
            className={cn(
              "space-y-3 rounded-lg border p-3",
              hasActiveFilters ? "border-[#13143E]/30 bg-[#13143E]/[0.06]" : "border-border/30 bg-muted/20",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Ταινία:</span>
              <select
                value={selectedMovieId == null ? "" : String(selectedMovieId)}
                onChange={(e) => setSelectedMovieId(e.target.value ? Number(e.target.value) : null)}
                className="h-9 min-w-[15rem] rounded-md border border-border bg-background px-2 text-sm text-foreground focus:border-[#13143E]/40 focus:outline-none focus:ring-2 focus:ring-[#13143E]/20"
              >
                <option value="">Επίλεξε ταινία (όλες)</option>
                {availableMovies.map((movie) => (
                  <option key={`movie-filter-${movie.id}`} value={String(movie.id)}>
                    {movieTitleLines(movie).primary}
                  </option>
                ))}
              </select>
            </div>
            {hasActiveFilters ? (
              <div className="rounded-md border border-[#13143E]/25 bg-white/70 px-3 py-2 text-xs text-[#13143E]">
                Φιλτραρισμένο αποτέλεσμα
                {selectedMovie ? ` · Ταινία: ${movieTitleLines(selectedMovie).primary}` : ""}
              </div>
            ) : null}
          </div>
          {programWeeks.length > 0 ? (
            <>
              {visibleWeeks.map((week) => (
                <VenueProgramCalendarWeek key={week.weekKey} week={week} now={now} />
              ))}
              {hiddenWeeks > 0 ? (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAllWeeks(true)}
                    className="rounded-md border border-border/60 bg-background px-4 py-2 text-sm text-foreground transition-colors hover:border-[#13143E]/40"
                  >
                    Φόρτωσε άλλες {hiddenWeeks} εβδομάδες
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border/40 bg-muted/15 px-4 py-6 text-sm text-muted-foreground">
              Δεν υπάρχουν προβολές για τα τρέχοντα φίλτρα.
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
