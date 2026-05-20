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
import { cn } from "@/lib/utils";

type ShowingSlot = { datetime: Date; hallName?: string };

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
};

type ProgramLine = { key: string; datetime: Date; hallName?: string; movie: StrapiMovie };

type ProgramDayGroup = {
  dayKey: string;
  label: string;
  lines: ProgramLine[];
};

type ProgramWeekGroup = {
  weekKey: string;
  weekStart: Date;
  weekEnd: Date;
  heading: string;
  days: ProgramDayGroup[];
};

function flattenShowingsToRows(showings: VenueShowingsBlock[]): ShowingRow[] {
  const rows: ShowingRow[] = [];
  for (const b of showings) {
    const slots = [...b.slots].sort((x, y) => x.datetime.getTime() - y.datetime.getTime());
    for (const slot of slots) {
      rows.push({
        key: `${b.key}-${slot.datetime.getTime()}-${slot.hallName ?? ""}`,
        datetime: slot.datetime,
        hallName: slot.hallName,
      });
    }
  }
  return rows.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function calendarDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatProgramDayLabel(d: Date, now: Date): string {
  const todayKey = calendarDayKey(now);
  const key = calendarDayKey(d);
  if (key === todayKey) return "Σήμερα";
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (key === calendarDayKey(tomorrow)) return "Αύριο";
  return d.toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" });
}

function groupProgramByCinemaWeek(lines: ProgramLine[], now: Date): ProgramWeekGroup[] {
  const byWeek = new Map<string, ProgramLine[]>();
  for (const line of lines) {
    const weekStart = startOfCinemaWeek(line.datetime);
    const weekKey = calendarDayKey(weekStart);
    if (!byWeek.has(weekKey)) byWeek.set(weekKey, []);
    byWeek.get(weekKey)!.push(line);
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekKey, weekLines]) => {
      const sorted = [...weekLines].sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
      const weekStart = startOfCinemaWeek(sorted[0].datetime);
      const weekEnd = endOfCinemaWeek(sorted[0].datetime);

      const byDay = new Map<string, ProgramLine[]>();
      for (const line of sorted) {
        const dayKey = calendarDayKey(line.datetime);
        if (!byDay.has(dayKey)) byDay.set(dayKey, []);
        byDay.get(dayKey)!.push(line);
      }

      const days: ProgramDayGroup[] = [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dayKey, dayLines]) => ({
          dayKey,
          label: formatProgramDayLabel(dayLines[0].datetime, now),
          lines: dayLines,
        }));

      return {
        weekKey,
        weekStart,
        weekEnd,
        heading: formatCinemaWeekHeading(weekStart, weekEnd, now),
        days,
      };
    });
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

/** Σελίδα προγράμματος χώρου: όλες οι ταινίες πάνω, πρόγραμμα κάτω ανά εβδομάδα κινηματογράφου. */
export default function VenueProgramLayout({ sections }: { sections: VenueProgramSection[] }) {
  const now = useMemo(() => new Date(), []);

  const { uniqueMovies, programWeeks } = useMemo(() => {
    const allEntries = sections.flatMap((s) => s.entries);

    const programLines: ProgramLine[] = allEntries
      .flatMap(({ movie, showings }) =>
        flattenShowingsToRows(showings).map((row) => ({
          key: `${movie.id}-${row.key}`,
          datetime: row.datetime,
          hallName: row.hallName,
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
        <section className="space-y-8 md:space-y-10">
          <h2 className="font-display text-lg font-semibold md:text-2xl">Πρόγραμμα</h2>
          {programWeeks.map((week) => (
            <div key={week.weekKey}>
              <h3 className="font-display mb-3 text-base font-semibold capitalize leading-snug text-foreground md:text-lg">
                {week.heading}
              </h3>
              <div className="space-y-4">
                {week.days.map((day) => (
                  <div key={day.dayKey}>
                    <p className="mb-1.5 text-[11px] font-semibold capitalize text-muted-foreground sm:text-xs">
                      {day.label}
                    </p>
                    <ul
                      className={cn(
                        "divide-y divide-border/50 overflow-hidden rounded-lg border border-border/15 bg-muted/20",
                        "text-xs leading-snug sm:text-sm",
                      )}
                    >
                      {day.lines.map((line) => {
                        const tl = movieTitleLines(line.movie);
                        return (
                          <li
                            key={line.key}
                            className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-2.5 py-2 sm:gap-x-3 sm:px-3"
                          >
                            <span className="w-[2.75rem] shrink-0 font-semibold tabular-nums text-foreground sm:w-12">
                              {formatClock(line.datetime)}
                            </span>
                            <Link
                              to={`/movies/${line.movie.slug}`}
                              className="min-w-0 flex-1 font-medium text-foreground hover:text-primary hover:underline"
                            >
                              {tl.primary}
                            </Link>
                            {line.hallName ? (
                              <span className="shrink-0 text-[11px] text-muted-foreground sm:text-xs">{line.hallName}</span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
