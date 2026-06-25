import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import PosterPicture from "@/components/PosterPicture";
import MoviePosterMeta from "@/components/MoviePosterMeta";
import { cn } from "@/lib/utils";
import GenreLinks from "@/components/GenreLinks";
import type { GenreLinkItem } from "@/lib/movieGenreLinks";
import { POSTER_BADGE_CORNER_TOP_LEFT, POSTER_BADGE_TOP_LEFT } from "@/lib/posterBadges";

interface EventCardProps {
  slug: string;
  title: string;
  /** Δεύτερη γραμμή (π.χ. πρωτότυπος τίτλος όταν ο κύριος είναι ελληνικός). */
  titleSecondary?: string;
  subtitle: string;
  genre: string;
  /** Αν υπάρχουν slugs, το είδος γίνεται σύνδεσμος προς `/movies/genre/…`. */
  genreLinkItems?: GenreLinkItem[];
  duration: number;
  /** Βαθμολογία IMDb (ταινίες). */
  imdbRating?: number | null;
  /** @deprecated Χρησιμοποίησε imdbRating */
  score?: number;
  /** Fallback όταν λείπει poster (π.χ. θέατρο) · οι ταινίες χρησιμοποιούν μόνο poster ή ουδέτερο φόντο */
  gradientFrom?: string;
  gradientTo?: string;
  posterUrl?: string;
  posterSrcSet?: string;
  type: "movie" | "theater";
  badge?: string;
  /** Επισήμανση μεταγλωτισμένης ταινίας (πάνω δεξιά στην αφίσα). */
  isDubbed?: boolean;
  /** Θερινή προβολή (πάνω δεξιά, πριν το «Μεταγλωτ.» αν υπάρχει). */
  summerScreening?: boolean;
  /** Λίστες όπως /movies: ηπιότερο πλαίσιο (λιγότερο «λευκό» από το προεπιλεγμένο card-elevated). */
  tone?: "default" | "soft";
  /** Σε λίστα με προβολές: τα κορυφαία (αφίσα+λίζτ) διατείνονται ώστε οι καρτέλες στην ίδια σειρά να ευθυγραμμίζονται. */
  attachShowtimes?: boolean;
  /** Με προβολές: αν δεν οριστεί, ευθυγράμμιση «πάνω» μερών όπως στις άλλες ταινίες (ίδια default με ταινίες). */
  uniformMovieSizing?: boolean;
  /** Αρχική / συμπαγής κάρτα: διάρκεια στην αφίσα, χωρίς σκηνοθέτη, είδος, διάρκεια κάτω. */
  compactMovieMeta?: boolean;
  /** Σκούρο section (π.χ. περιοδείες αρχικής): σκούρο κείμενο σε λευκή κάρτα. */
  darkSectionCard?: boolean;
  /** Πρώτες ορατές αφίσες — LCP / image delivery */
  posterPriority?: boolean;
  /** Θέατρο: εύρος τιμών (π.χ. «12 – 18 €»). */
  theaterPriceLine?: string;
  /** Θέατρο: σύντομο πρόγραμμα (π.χ. «Τετ 19:00 · Πέμ 20:30»). */
  theaterScheduleLine?: string;
  className?: string;
  index?: number;
}

const EventCard = ({
  slug,
  title,
  titleSecondary,
  subtitle,
  genre,
  genreLinkItems,
  duration,
  imdbRating,
  score,
  gradientFrom,
  gradientTo,
  posterUrl,
  posterSrcSet,
  type,
  badge,
  isDubbed = false,
  summerScreening = false,
  tone = "default",
  attachShowtimes = false,
  uniformMovieSizing,
  compactMovieMeta = false,
  darkSectionCard = false,
  posterPriority = false,
  theaterPriceLine,
  theaterScheduleLine,
  className = "",
  index: _index = 0,
}: EventCardProps) => {
  const showGradientFallback =
    !posterUrl && typeof gradientFrom === "string" && typeof gradientTo === "string";
  const subtitleLine = typeof subtitle === "string" && subtitle.trim() ? subtitle.trim() : "\u00a0";
  const secondaryLine =
    typeof titleSecondary === "string" &&
    titleSecondary.trim() &&
    titleSecondary.trim().toLocaleLowerCase("el") !== title.trim().toLocaleLowerCase("el")
      ? titleSecondary.trim()
      : "";
  const posterAlt = secondaryLine ? `${title} · ${secondaryLine}` : title;
  const showDuration = typeof duration === "number" && Number.isFinite(duration) && duration > 0;
  const genreTrimmed = typeof genre === "string" ? genre.trim() : "";
  const isMovie = type === "movie";
  const isTheater = type === "theater";
  const soldOutBadge = typeof badge === "string" && badge.trim().toUpperCase() === "SOLD OUT";
  /** Οριζόντια αφίσα θεάτρου — ολόκληρη, χωρίς crop σε 2:3. */
  const landscapePoster = isTheater;
  /** Αρχική περιοδείες: μόνο τίτλος κάτω από την αφίσα. */
  const theaterHomeCompact = isTheater && compactMovieMeta;
  /** Ομοιόμορφες καρτέλες για ταινίες ανά σειρά · θέατρο όχι. */
  const uniformMovie = uniformMovieSizing ?? isMovie;
  /** Λίστα /movies ή αρχική: διάρκεια στην αφίσα, χωρίς είδος/σκηνοθέτη κάτω. */
  const movieListingMeta = isMovie && (attachShowtimes || compactMovieMeta);
  const titleClass = darkSectionCard
    ? "!text-[#13143E] group-hover:!text-[#0a0b28]"
    : "text-foreground group-hover:text-primary";
  const metaClass = darkSectionCard ? "!text-[#13143E]/90" : "text-muted-foreground";
  /** Οριζόντια σειρά (αρχική, κ.λπ.): σταθερό ύψος τίτλου/υπότιτλου/ειδους. */
  const uniformScrollCard = uniformMovie && !movieListingMeta && !attachShowtimes;

  /** Θέατρο: συμπαγής κάρτα — χωρίς τέντωμα ύψους (grid / οριζόντια σειρά). */
  const theaterCompactCard = isTheater && !attachShowtimes;

  return (
    <div
      className={cn(
        attachShowtimes
          ? "flex w-full min-w-0 shrink-0 flex-col"
          : cn(
              "flex min-w-0 flex-col",
              theaterCompactCard ? "h-auto" : "h-full min-h-0 flex-1",
            ),
        className,
      )}
    >
      <Link
        to={`/${type === "movie" ? "movies" : "theater"}/${slug}`}
        className={cn(
          "group flex min-h-0 flex-col overflow-hidden transition-all duration-200 ease-in-out",
          attachShowtimes
            ? "w-full shrink-0 rounded-b-none rounded-t-lg bg-transparent shadow-none ring-0 hover:translate-y-0 hover:shadow-none hover:ring-0"
            : cn(
                theaterCompactCard ? "h-auto w-full" : "h-full min-h-0 flex-1",
                tone === "soft"
                  ? "rounded-lg border-transparent bg-muted/35 shadow-none ring-1 ring-border/10 hover:-translate-y-0.5 hover:bg-muted/45 hover:shadow-[0_4px_14px_rgba(28,29,98,0.09)] hover:ring-border/[0.22]"
                  : cn(
                      "card-elevated rounded-lg",
                      darkSectionCard &&
                        "home-tour-card bg-white shadow-[0_8px_28px_rgba(0,0,0,0.28)] ring-1 ring-white/20",
                    ),
              ),
        )}
      >
        <div
          className={cn(
            "relative w-full shrink-0 overflow-hidden",
            landscapePoster
              ? "flex h-28 items-center justify-center bg-[#ebe8f2] px-2 py-2 sm:h-32 md:h-36"
              : "aspect-[2/3] bg-secondary",
            !posterUrl && !showGradientFallback && !landscapePoster && "bg-secondary",
            !posterUrl && !showGradientFallback && landscapePoster && "bg-[#ebe8f2]",
          )}
          style={
            showGradientFallback ? { background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` } : undefined
          }
        >
          {posterUrl ? (
            <PosterPicture
              src={posterUrl}
              srcSet={posterSrcSet}
              alt={posterAlt}
              width={landscapePoster ? 520 : 400}
              height={landscapePoster ? 390 : 600}
              fit={landscapePoster ? "contain" : "cover"}
              loading={posterPriority ? "eager" : "lazy"}
              fetchPriority={posterPriority ? "high" : undefined}
              sizes={
                landscapePoster
                  ? "(max-width: 640px) 82vw, (max-width: 1024px) 42vw, 360px"
                  : "(max-width: 640px) 45vw, (max-width: 1024px) 28vw, 200px"
              }
              className={landscapePoster ? undefined : "transition-transform duration-500 group-hover:scale-105"}
            />
          ) : null}
          {isMovie ? (
            <MoviePosterMeta
              movie={{
                imdbRating: imdbRating ?? undefined,
                criticScore: score,
                duration,
                isDubbed,
                summerScreening,
              }}
              badge={badge}
            />
          ) : soldOutBadge ? (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[2] -translate-y-1/2">
              <div className="mx-auto w-[94%] -rotate-[5deg] rounded-sm bg-gradient-to-r from-[#8E0019] via-[#C10022] to-[#8E0019] px-3 py-2.5 text-center shadow-[0_10px_24px_rgba(0,0,0,0.35)] ring-1 ring-[#ffd3db]/50">
                <span className="absolute -left-1 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white/35 blur-[0.5px]" />
                <span className="absolute -right-1 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white/35 blur-[0.5px]" />
                <span className="font-display text-base font-bold tracking-[0.14em] text-white md:text-lg">SOLD OUT</span>
              </div>
            </div>
          ) : badge ? (
            <span
              className={`home-tour-card-badge ${POSTER_BADGE_CORNER_TOP_LEFT} ${POSTER_BADGE_TOP_LEFT} text-xs`}
            >
              {badge}
            </span>
          ) : null}
        </div>
        <div
          className={cn(
            "flex min-h-0 flex-col px-3 pb-2",
            isTheater && !attachShowtimes ? "pt-2" : "pt-1.5",
            attachShowtimes
              ? "shrink-0 border-t border-border/[0.1] px-3 py-2 pb-2"
              : cn(
                  theaterCompactCard ? "shrink-0" : "min-h-0 flex-1 gap-0",
                  tone === "soft"
                    ? "border-t border-border/[0.07]"
                    : darkSectionCard
                      ? "border-t border-[#13143E]/10"
                      : "border-t border-border/12",
                ),
          )}
        >
          <div
            className={cn(
              "flex shrink-0 flex-col",
              uniformScrollCard
                ? "min-h-[7.25rem]"
                : isMovie
                  ? movieListingMeta
                    ? "min-h-[3.75rem]"
                    : "min-h-[5.5rem]"
                  : theaterHomeCompact
                    ? "min-h-[2.5rem]"
                    : "min-h-0",
            )}
          >
            <h3
              className={cn(
                "font-display font-semibold leading-tight transition-colors",
                titleClass,
                isMovie ? "line-clamp-2 text-base" : "line-clamp-2 text-base",
                isMovie && "min-h-[2.5rem]",
                uniformScrollCard && "min-h-[2.5rem]",
              )}
            >
              {title}
            </h3>
            {theaterHomeCompact && subtitleLine !== "\u00a0" ? (
              <p className={cn("mt-0.5 line-clamp-1 text-sm font-medium leading-snug", metaClass)}>{subtitleLine}</p>
            ) : null}
            {isMovie ? (
              <p
                className="mt-0.5 line-clamp-2 min-h-[2.4375rem] text-sm font-medium leading-snug text-muted-foreground"
                {...(!secondaryLine ? { "aria-hidden": true as const } : {})}
              >
                {secondaryLine || "\u00a0"}
              </p>
            ) : titleSecondary ? (
              <p className={cn("mt-0.5 text-sm font-medium leading-snug line-clamp-2", metaClass)}>{titleSecondary}</p>
            ) : null}
            {isMovie && !movieListingMeta ? (
              genreLinkItems?.length ? (
                <div
                  className={cn("mt-1 min-h-[1.125rem] max-w-full", uniformScrollCard && !genreLinkItems.length && "invisible")}
                >
                  <GenreLinks items={genreLinkItems} variant="inline" className="text-[10px] md:text-[11px]" />
                </div>
              ) : (
                <p
                  className={cn(
                    "mt-1 max-w-full truncate text-[10px] font-normal leading-snug tracking-tight text-muted-foreground/82",
                    uniformScrollCard && "min-h-[1.125rem]",
                    uniformScrollCard && !genreTrimmed && "invisible",
                  )}
                  title={genreTrimmed || undefined}
                  {...(!genreTrimmed && !uniformScrollCard ? { "aria-hidden": true as const } : {})}
                >
                  {(genreTrimmed || (uniformScrollCard ? "\u00a0" : "")).replace(/\s*·\s*/g, " · ")}
                </p>
              )
            ) : null}
          </div>
          {isMovie && !movieListingMeta && uniformMovie ? (
            <div className="min-h-0 flex-1 shrink grow basis-0" aria-hidden />
          ) : null}
          {movieListingMeta || theaterHomeCompact ? null : (
            <>
              <p className={cn("mb-1 mt-1 min-h-0 shrink-0 text-sm leading-snug line-clamp-1", metaClass)}>
                {subtitleLine}
              </p>
              <div
                className={cn(
                  "flex shrink-0 items-end gap-2 pt-1",
                  type === "movie" ? "justify-end" : "justify-between",
                  !attachShowtimes && !uniformMovie && !isTheater ? "mt-auto" : "",
                )}
              >
                {isTheater ? (
                  <span
                    className={cn(
                      "min-w-0 flex-1 text-xs font-medium uppercase tracking-wider line-clamp-1",
                      darkSectionCard ? "!text-[#13143E]/80" : "text-muted-foreground/90",
                    )}
                  >
                    {genreTrimmed || "\u00a0"}
                  </span>
                ) : null}
                {!isMovie && showDuration ? (
                  <div className={cn("flex shrink-0 items-center gap-1 text-sm", metaClass)}>
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>{duration}&nbsp;′</span>
                  </div>
                ) : null}
              </div>
              {isTheater && (theaterPriceLine || theaterScheduleLine) ? (
                <div className="mt-2 space-y-0.5 border-t border-border/50 pt-2 text-xs leading-snug">
                  {theaterPriceLine ? (
                    <p
                      className={cn(
                        "font-semibold tabular-nums",
                        darkSectionCard ? "text-[#13143E]" : "text-foreground",
                      )}
                    >
                      {theaterPriceLine}
                    </p>
                  ) : null}
                  {theaterScheduleLine ? (
                    <p
                      className={cn(
                        "line-clamp-2",
                        darkSectionCard ? "text-[#13143E]/75" : "text-muted-foreground",
                      )}
                    >
                      {theaterScheduleLine}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </Link>
    </div>
  );
};

export default EventCard;