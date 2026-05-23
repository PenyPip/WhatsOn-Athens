import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
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
  score?: number;
  /** Fallback όταν λείπει poster (π.χ. θέατρο) · οι ταινίες χρησιμοποιούν μόνο poster ή ουδέτερο φόντο */
  gradientFrom?: string;
  gradientTo?: string;
  posterUrl?: string;
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
  score,
  gradientFrom,
  gradientTo,
  posterUrl,
  type,
  badge,
  isDubbed = false,
  tone = "default",
  attachShowtimes = false,
  uniformMovieSizing,
  compactMovieMeta = false,
  className = "",
  index: _index = 0,
}: EventCardProps) => {
  const showGradientFallback =
    !posterUrl && typeof gradientFrom === "string" && typeof gradientTo === "string";
  const subtitleLine = typeof subtitle === "string" && subtitle.trim() ? subtitle.trim() : "\u00a0";
  const posterAlt = titleSecondary ? `${title} · ${titleSecondary}` : title;
  const showDuration = typeof duration === "number" && Number.isFinite(duration) && duration > 0;
  const genreTrimmed = typeof genre === "string" ? genre.trim() : "";
  const isMovie = type === "movie";
  /** Ομοιόμορφες καρτέλες για ταινίες ανά σειρά · θέατρο όχι. */
  const uniformMovie = uniformMovieSizing ?? isMovie;
  const secondaryLine = typeof titleSecondary === "string" && titleSecondary.trim() ? titleSecondary.trim() : "";
  /** Λίστα /movies ή αρχική: διάρκεια στην αφίσα, χωρίς είδος/σκηνοθέτη κάτω. */
  const movieListingMeta = isMovie && (attachShowtimes || compactMovieMeta);
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
                  : "card-elevated rounded-lg",
              ),
        )}
      >
        <div
          className={cn(
            "relative aspect-[2/3] shrink-0 overflow-hidden",
            !posterUrl && !showGradientFallback && "bg-secondary",
          )}
          style={
            showGradientFallback ? { background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` } : undefined
          }
        >
          {posterUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- αφίσες Strapi, static export */}
              <img
                src={posterUrl}
                alt={posterAlt}
                width={400}
                height={600}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </>
          )}
          {badge && (
            <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded bg-[#13143E] text-white z-10">
              {badge}
            </span>
          )}
          {isDubbed && (
            <span className="absolute top-2 right-2 z-10 rounded bg-amber-600/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm">
              Μεταγλωτ.
            </span>
          )}
          {movieListingMeta && showDuration ? (
            <span
              className="absolute bottom-2 right-2 z-10 flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold leading-none tabular-nums text-[#13143E] shadow-[0_1px_5px_rgba(0,0,0,0.35)] ring-1 ring-[#13143E]/25"
              aria-label={`Διάρκεια ${duration} λεπτά`}
            >
              {duration}′
            </span>
          ) : null}
          {score && (
            <div
              className={cn(
                "absolute bottom-2 left-2 rounded px-2 py-0.5 text-xs font-bold text-[#13143E] z-10",
                tone === "soft"
                  ? "bg-background/85 ring-1 ring-border/[0.08]"
                  : "bg-card/95 shadow-sm ring-1 ring-border/10",
              )}
            >
              {score}/10
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex min-h-0 flex-col px-3 pb-2 pt-1.5",
            attachShowtimes
              ? "shrink-0 border-t border-border/[0.1] px-3 py-2 pb-2"
              : cn(
                  "min-h-0 flex-1 gap-0",
                  tone === "soft" ? "border-t border-border/[0.07]" : "border-t border-border/12",
                ),
          )}
        >
          <div
            className={cn(
              "flex shrink-0 flex-col",
              uniformScrollCard ? "min-h-[7.25rem]" : isMovie ? (movieListingMeta ? "min-h-[4.25rem]" : "min-h-[5.5rem]") : "min-h-[2.75rem]",
            )}
          >
            <h3
              className={cn(
                "font-display font-semibold leading-tight text-foreground transition-colors group-hover:text-primary",
                isMovie ? "line-clamp-2 text-base" : "line-clamp-2 text-base",
                uniformScrollCard && "min-h-[2.5rem]",
              )}
            >
              {title}
            </h3>
            {isMovie ? (
              <p
                className="mt-0.5 line-clamp-2 min-h-[2.4375rem] text-sm font-medium leading-snug text-muted-foreground"
                {...(!secondaryLine ? { "aria-hidden": true as const } : {})}
              >
                {secondaryLine || "\u00a0"}
              </p>
            ) : titleSecondary ? (
              <p className="mt-0.5 text-sm font-medium leading-snug text-muted-foreground line-clamp-2">{titleSecondary}</p>
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
          {movieListingMeta ? null : (
            <>
              <p className="mb-1 mt-2 min-h-[1.3125rem] shrink-0 text-sm leading-snug text-muted-foreground line-clamp-1">
                {subtitleLine}
              </p>
              <div
                className={cn(
                  "flex shrink-0 items-end gap-2 pt-1",
                  type === "movie" ? "justify-end" : "justify-between",
                  !attachShowtimes && !uniformMovie ? "mt-auto" : "",
                )}
              >
                {type === "theater" ? (
                  <span className="min-w-0 flex-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/90 line-clamp-1">
                    {genreTrimmed || "\u00a0"}
                  </span>
                ) : null}
                {showDuration ? (
                  <div className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
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