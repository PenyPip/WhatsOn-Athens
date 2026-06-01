import ImdbRatingBadge from "@/components/ImdbRatingBadge";
import { resolveImdbRating, type MovieImdbFields } from "@/lib/movieImdb";
import {
  POSTER_BADGE_CORNER_TOP_LEFT,
  POSTER_BADGE_CORNER_TOP_RIGHT,
  POSTER_BADGE_TOP_LEFT,
  POSTER_BADGE_TOP_RIGHT_AMBER,
} from "@/lib/posterBadges";

type MoviePosterMetaProps = {
  movie: MovieImdbFields & { duration?: number; isDubbed?: boolean; summerScreening?: boolean };
  /** Ετικέτα πάνω αριστερά (π.χ. «Νέα», «Πρεμιέρα»). */
  badge?: string;
};

/** IMDb κάτω αριστερά · διάρκεια κάτω δεξιά · πάνω: αριστερά badge, δεξιά θερινό/μεταγλωτ. */
export default function MoviePosterMeta({ movie, badge }: MoviePosterMetaProps) {
  const imdb = resolveImdbRating(movie);
  const showDuration = typeof movie.duration === "number" && Number.isFinite(movie.duration) && movie.duration > 0;
  const topRight: { key: string; label: string }[] = [];
  if (movie.summerScreening) topRight.push({ key: "summer", label: "Θερινό" });
  if (movie.isDubbed) topRight.push({ key: "dub", label: "Μεταγλωτ." });

  return (
    <>
      {badge ? (
        <span className={`${POSTER_BADGE_CORNER_TOP_LEFT} ${POSTER_BADGE_TOP_LEFT}`}>{badge}</span>
      ) : null}
      {topRight.length > 0 ? (
        <div className={POSTER_BADGE_CORNER_TOP_RIGHT}>
          {topRight.map(({ key, label }) => (
            <span key={key} className={POSTER_BADGE_TOP_RIGHT_AMBER}>
              {label}
            </span>
          ))}
        </div>
      ) : null}
      {imdb != null ? (
        <ImdbRatingBadge rating={imdb} variant="poster" className="bottom-2 left-2 right-auto top-auto" />
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
