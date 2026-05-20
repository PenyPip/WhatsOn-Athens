import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { StrapiMovie } from "@/lib/api";
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

type ShowingRow = {
  key: string;
  datetime: Date;
  hallName?: string;
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

function VenueMoviePoster({ movie, index }: { movie: StrapiMovie; index: number }) {
  const tl = movieTitleLines(movie);
  const alt = posterAltForMovie(movie);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.2) }}
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

type ProgramLine = { key: string; datetime: Date; hallName?: string; movie: StrapiMovie };

export default function VenueProgramDay({
  label,
  entries,
}: {
  label: string;
  entries: VenueProgramDayEntry[];
}) {
  const uniqueMovies = [...new Map(entries.map((e) => [e.movie.id, e.movie])).values()];

  const programLines: ProgramLine[] = entries
    .flatMap(({ movie, showings }) =>
      flattenShowingsToRows(showings).map((row) => ({
        key: `${movie.id}-${row.key}`,
        datetime: row.datetime,
        hallName: row.hallName,
        movie,
      })),
    )
    .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

  if (!uniqueMovies.length && !programLines.length) return null;

  return (
    <section>
      <h2 className="font-display mb-4 text-lg font-semibold capitalize md:text-2xl">{label}</h2>

      {uniqueMovies.length > 0 ? (
        <div className="mb-5 md:mb-6">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground md:text-[11px]">
            Ταινίες
          </p>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8">
            {uniqueMovies.map((movie, i) => (
              <VenueMoviePoster key={movie.id} movie={movie} index={i} />
            ))}
          </div>
        </div>
      ) : null}

      {programLines.length > 0 ? (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground md:text-[11px]">
            Πρόγραμμα
          </p>
          <ul
            className={cn(
              "divide-y divide-border/50 overflow-hidden rounded-lg border border-border/15 bg-muted/20",
              "text-xs leading-snug sm:text-sm",
            )}
          >
            {programLines.map((line) => {
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
      ) : null}
    </section>
  );
}
