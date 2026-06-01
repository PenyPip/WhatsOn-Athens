import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import PosterPicture from "@/components/PosterPicture";
import MoviePosterMeta from "@/components/MoviePosterMeta";
import { cn } from "@/lib/utils";
import GenreLinks from "@/components/GenreLinks";
import type { GenreLinkItem } from "@/lib/movieGenreLinks";

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
  /** Επισήμανση μεταγλωτισμένης ταινίας (δεξιά στην αφίσα). */
  isDubbed?: boolean;
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
  tone = "default",
  attachShowtimes = false,
  uniformMovieSizing,
  compactMovieMeta = false,
  darkSectionCard = false,
  posterPriority = false,
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

  return (
    <div
      className={cn(
        attachShowtimes
          ? "flex w-full min-w-0 shrink-0 flex-col"
          : "flex h-full min-h-0 min-w-0 flex-1 flex-col",
        className,
      )}
    >
      <Link
        to={`/${type === "movie" ? "movies" : "theater"}/${slug}`}
        className={cn(
          "group flex min-h-0 flex-col overflow-hidden transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          attachShowtimes
            ? "w-full shrink-0 rounded-b-none rounded-t-lg bg-transparent shadow-none ring-0 hover:translate-y-0 hover:shadow-none hover:ring-0"
            : cn(
                "h-full min-h-0 flex-1",
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
            "relative shrink-0 overflow-hidden",
            landscapePoster ? "aspect-[3/2] bg-[#ebe8f2]" : "aspect-[2/3]",
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
              width={400}
              height={600}
              loading={posterPriority ? "eager" : "lazy"}
              fetchPriority={posterPriority ? "high" : undefined}
              sizes={
                landscapePoster
                  ? "(max-width: 640px) 72vw, (max-width: 1024px) 36vw, 304px"
                  : "(max-width: 640px) 45vw, (max-width: 1024px) 28vw, 200px"
              }
              className={cn(
                "h-full w-full transition-transform duration-500",
                landscapePoster
                  ? "object-contain object-center p-1.5 group-hover:scale-[1.02]"
                  : "object-cover group-hover:scale-105",
              )}
            />
          ) : null}
          {isMovie ? (
            <MoviePosterMeta
              movie={{
                imdbRating: imdbRating ?? undefined,
                criticScore: score,
                duration,
                isDubbed,
              }}
              badge={badge}
            />
          ) : badge ? (
            <span className="absolute left-2 top-2 z-10 rounded bg-[#13143E] px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">
              {badge}
            </span>
          ) : null}
        </div>
        <div
          className={cn(
            "flex min-h-0 flex-col px-3 pb-2 pt-1.5",
            attachShowtimes
              ? "shrink-0 border-t border-border/[0.1] px-3 py-2 pb-2"
              : cn(
                  "min-h-0 flex-1 gap-0",
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
                    : "min-h-[2.75rem]",
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
              <p className={cn("mb-1 mt-2 min-h-[1.3125rem] shrink-0 text-sm leading-snug line-clamp-1", metaClass)}>
                {subtitleLine}
              </p>
              <div
                className={cn(
                  "flex shrink-0 items-end gap-2 pt-1",
                  type === "movie" ? "justify-end" : "justify-between",
                  !attachShowtimes && !uniformMovie ? "mt-auto" : "",
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
            </>
          )}
        </div>
      </Link>
    </div>
  );
};

export default EventCard;