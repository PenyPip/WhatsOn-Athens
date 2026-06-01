import ImdbRatingBadge from "@/components/ImdbRatingBadge";
import { resolveImdbRating, type MovieImdbFields } from "@/lib/movieImdb";

type MoviePosterMetaProps = {
  movie: MovieImdbFields & { duration?: number; isDubbed?: boolean };
  /** Προαιρετική ετικέτα πάνω αριστερά (π.χ. «Νέα»). */
  badge?: string;
};

/** IMDb κάτω αριστερά · διάρκεια κάτω δεξιά στην αφίσα — ίδιο σε αρχική, /movies, hero κ.λπ. */
export default function MoviePosterMeta({ movie, badge }: MoviePosterMetaProps) {
  const imdb = resolveImdbRating(movie);
  const showDuration = typeof movie.duration === "number" && Number.isFinite(movie.duration) && movie.duration > 0;

  return (
    <>
      {badge ? (
        <span className="absolute left-2 top-2 z-10 rounded bg-[#13143E] px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">
          {badge}
        </span>
      ) : null}
      {imdb != null ? (
        <ImdbRatingBadge rating={imdb} variant="poster" className="bottom-2 left-2 right-auto top-auto" />
      ) : null}
      {movie.isDubbed ? (
        <span className="absolute right-2 top-2 z-10 rounded bg-amber-600/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm">
          Μεταγλωτ.
        </span>
      ) : null}
      {showDuration ? (
        <span
          className="absolute bottom-2 right-2 z-10 flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold leading-none tabular-nums text-[#13143E] shadow-[0_1px_5px_rgba(0,0,0,0.35)] ring-1 ring-[#13143E]/25"
          aria-label={`Διάρκεια ${movie.duration} λεπτά`}
        >
          {movie.duration}′
        </span>
      ) : null}
    </>
  );
}
