import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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

type ShowingSlot = { datetime: Date; hallName?: string; summerScreening?: boolean };

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
};

type ProgramLine = {
  key: string;
  datetime: Date;
  hallName?: string;
  summerScreening?: boolean;
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
      rows.push({
        key: `${b.key}-${slot.datetime.getTime()}-${slot.hallName ?? ""}`,
        datetime: slot.datetime,
        hallName: slot.hallName,
        summerScreening: slot.summerScreening,
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.24) }}
    >
      <Link
        to={`/movies/${movie.slug}`}
        className="group block min-w-0"
        title={tl.secondary ? `${tl.primary} (${tl.secondary})` : tl.primary}
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-muted ring-1 ring-border/15 transition-[box-shadow,ring-color] group-hover:ring-[#13143E]/25 group-hover:shadow-md">
          {movie.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={movie.posterUrl}
              alt={alt}
              width={200}
              height={300}
              loading="lazy"
              decoding="async"
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
    </motion.div>
  );
}

function VenueCalendarScreening({ line }: { line: ProgramLine }) {
  const tl = movieTitleLines(line.movie);
  return (
    <div className="rounded-md border-l-[3px] border-l-[#13143E] bg-background py-2 pl-2.5 pr-2 shadow-sm ring-1 ring-border/20 transition-shadow hover:ring-[#13143E]/25">
      <div className="flex items-center gap-1">
        <time
          dateTime={line.datetime.toISOString()}
          className="text-sm font-bold tabular-nums leading-none text-[#13143E]"
        >
          {formatClock(line.datetime)}
        </time>
        {line.summerScreening ? <SummerScreeningIndicator iconClassName="h-3 w-3" /> : null}
      </div>
      <Link
        to={`/movies/${line.movie.slug}`}
        className="mt-1 block text-[11px] font-medium leading-snug text-foreground hover:text-primary hover:underline sm:text-xs"
      >
        {tl.primary}
      </Link>
      {line.hallName ? (
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{line.hallName}</p>
      ) : null}
    </div>
  );
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

/** Στήλη μίας ημέρας στο οριζόντιο ημερολόγιο. */
function VenueCalendarDayColumn({ day, isToday }: { day: ProgramDayGroup; isToday: boolean }) {
  return (
    <div
      className={cn(
        "flex min-h-[8rem] min-w-[6.25rem] flex-col sm:min-h-[8.5rem] sm:min-w-[6.75rem] lg:min-h-[9rem] lg:min-w-0",
        isToday && "bg-[#13143E]/[0.03]",
      )}
      aria-label={`${day.weekdayShort} ${day.dayNumber} ${day.monthShort}`}
    >
      <VenueDayHeader day={day} isToday={isToday} />
      <div className="flex flex-1 flex-col items-stretch gap-2 p-2 text-left">
        {day.lines.length > 0 ? (
          day.lines.map((line) => <VenueCalendarScreening key={line.key} line={line} />)
        ) : (
          <p className="py-4 text-left text-[10px] text-muted-foreground/50">—</p>
        )}
      </div>
    </div>
  );
}

function VenueProgramCalendarWeek({ week, now }: { week: ProgramWeekGroup; now: Date }) {
  const colCount = week.days.length;

  return (
    <article className="overflow-hidden rounded-xl border border-border/20 bg-card/40 shadow-sm">
      <header className="border-b border-border/15 bg-muted/25 px-4 py-3 text-left md:px-5">
        <h3 className="font-display text-base font-semibold leading-snug text-foreground md:text-lg">
          {week.heading}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">Εβδομαδιαίο ημερολόγιο προβολών</p>
      </header>

      <div className="overflow-x-auto overscroll-x-contain">
        <div
          className="grid min-w-max divide-x divide-border/20 lg:min-w-0 lg:w-full"
          style={{ gridTemplateColumns: `repeat(${colCount}, minmax(6.25rem, 1fr))` }}
        >
          {week.days.map((day) => (
            <VenueCalendarDayColumn
              key={day.dayKey}
              day={day}
              isToday={isTodayCalendarDay(day.date, now)}
            />
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

  const { uniqueMovies, programWeeks } = useMemo(() => {
    const allEntries = sections.flatMap((s) => s.entries);

    const programLines: ProgramLine[] = allEntries
      .flatMap(({ movie, showings }) =>
        flattenShowingsToRows(showings).map((row) => ({
          key: `${movie.id}-${row.key}`,
          datetime: row.datetime,
          hallName: row.hallName,
          summerScreening: row.summerScreening,
          movie,
        })),
      )
      .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

    const firstShowByMovie = new Map<number, number>();
    for (const line of programLines) {
      const t = line.datetime.getTime();
      const prev = firstShowByMovie.get(line.movie.id);
      if (prev === undefined || t < prev) firstShowByMovie.set(line.movie.id, t);
    }

    const movies = [...new Map(allEntries.map((e) => [e.movie.id, e.movie])).values()];
    movies.sort((a, b) => (firstShowByMovie.get(a.id) ?? 0) - (firstShowByMovie.get(b.id) ?? 0));

    return {
      uniqueMovies: movies,
      programWeeks: groupProgramByCinemaWeek(programLines, now),
    };
  }, [sections, now]);

  if (!uniqueMovies.length && !programWeeks.length) return null;

  return (
    <div className="space-y-10 md:space-y-12">
      {uniqueMovies.length > 0 ? (
        <section>
          <h2 className="font-display mb-3 text-lg font-semibold md:mb-4 md:text-2xl">Ταινίες</h2>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8">
            {uniqueMovies.map((movie, i) => (
              <VenueMoviePoster key={movie.id} movie={movie} index={i} />
            ))}
          </div>
        </section>
      ) : null}

      {programWeeks.length > 0 ? (
        <section id="venue-program" className="scroll-mt-28 space-y-5 md:space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold md:text-2xl">Πρόγραμμα</h2>
              <p className="mt-1 text-sm text-muted-foreground">Εβδομαδιαίο ημερολόγιο προβολών</p>
            </div>
            {venue && isValidExternalUrl(venue.moreLink) ? (
              <VenueBookingLink venue={venue} variant="button" className="shrink-0" />
            ) : null}
          </div>
          {programWeeks.map((week) => (
            <VenueProgramCalendarWeek key={week.weekKey} week={week} now={now} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
