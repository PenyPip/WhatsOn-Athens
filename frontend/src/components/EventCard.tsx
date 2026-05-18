import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventCardProps {
  slug: string;
  title: string;
  /** Δεύτερη γραμμή (π.χ. πρωτότυπος τίτλος όταν ο κύριος είναι ελληνικός). */
  titleSecondary?: string;
  subtitle: string;
  genre: string;
  duration: number;
  score?: number;
  /** Fallback όταν λείπει poster (π.χ. θέατρο) · οι ταινίες χρησιμοποιούν μόνο poster ή ουδέτερο φόντο */
  gradientFrom?: string;
  gradientTo?: string;
  posterUrl?: string;
  type: "movie" | "theater";
  badge?: string;
  /** Λίστες όπως /movies: ηπιότερο πλαίσιο (λιγότερο «λευκό» από το προεπιλεγμένο card-elevated). */
  tone?: "default" | "soft";
  /** Το επόμενο μπλοκ είναι προβολές στο ίδιο χαρτόνι· χωρίς κενό/δίπλα πλαίσιο κάτω από διάρκεια. */
  attachShowtimes?: boolean;
  className?: string;
  index?: number;
}

const EventCard = ({
  slug,
  title,
  titleSecondary,
  subtitle,
  genre,
  duration,
  score,
  gradientFrom,
  gradientTo,
  posterUrl,
  type,
  badge,
  tone = "default",
  attachShowtimes = false,
  className = "",
  index = 0,
}: EventCardProps) => {
  const showGradientFallback =
    !posterUrl && typeof gradientFrom === "string" && typeof gradientTo === "string";
  const subtitleLine = typeof subtitle === "string" && subtitle.trim() ? subtitle : "\u00a0";
  const posterAlt = titleSecondary ? `${title} · ${titleSecondary}` : title;
  const showDuration = typeof duration === "number" && Number.isFinite(duration) && duration > 0;
  const genreTrimmed = typeof genre === "string" ? genre.trim() : "";
  const isMovie = type === "movie";
  const secondaryLine = typeof titleSecondary === "string" && titleSecondary.trim() ? titleSecondary.trim() : "";
  /** Σελίδα λίστας προβολών: το είδος κάτω από τον τίτλο μαζί με σκηνοθέτη και διάρκεια. */
  const movieListingMeta = isMovie && attachShowtimes;

  return (
    <motion.div
      className={cn(attachShowtimes ? "w-full shrink-0" : "h-full", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link
        to={`/${type === "movie" ? "movies" : "theater"}/${slug}`}
        className={cn(
          "group flex min-h-0 flex-col overflow-hidden transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          attachShowtimes
            ? "h-auto shrink-0 w-full rounded-b-none rounded-t-lg bg-transparent shadow-none ring-0 hover:translate-y-0 hover:shadow-none hover:ring-0"
            : cn(
                "h-full",
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
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </>
          )}
          {badge && (
            <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded bg-[#13143E] text-white z-10">
              {badge}
            </span>
          )}
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
            "flex flex-col px-3 py-2",
            attachShowtimes
              ? "shrink-0 border-t border-border/[0.1] px-3 py-2 pb-2"
              : cn(
                  "min-h-[8.25rem] flex-1",
                  tone === "soft" ? "border-t border-border/[0.07]" : "border-t border-border/12",
                ),
          )}
        >
          {type === "movie" && genreTrimmed && !movieListingMeta ? (
            <p className="mb-1.5 line-clamp-3 max-w-full shrink-0 break-words text-[11px] font-semibold uppercase leading-snug tracking-wider text-muted-foreground/95">
              <span className="font-normal text-muted-foreground/75">Είδος · </span>
              {genreTrimmed}
            </p>
          ) : null}
          <div
            className={cn(
              isMovie ? "flex min-h-[5.125rem] flex-col" : "min-h-[2.75rem]",
            )}
          >
            <h3
              className={cn(
                "font-display font-semibold leading-tight text-foreground transition-colors group-hover:text-primary",
                isMovie
                  ? "line-clamp-2 min-h-[2.5rem] text-base"
                  : "line-clamp-2 text-base",
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
          </div>
          {movieListingMeta ? (
            <div className={cn("mb-1 mt-1 flex min-h-[1.25rem] flex-col gap-1.5 text-sm leading-snug text-muted-foreground")}>
              {genreTrimmed ? (
                <p className="line-clamp-2 max-w-full break-words">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/85">Είδος · </span>
                  <span className="text-foreground/90">{genreTrimmed}</span>
                </p>
              ) : null}
              {typeof subtitle === "string" && subtitle.trim() ? (
                <p className="line-clamp-2 break-words text-foreground/90">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/85">
                    Σκηνοθεσία ·{" "}
                  </span>
                  {subtitle.trim()}
                </p>
              ) : null}
              {showDuration ? (
                <div className="flex shrink-0 items-center gap-1 pt-0.5 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>{duration}&nbsp;′</span>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <p className="mb-1.5 mt-1 min-h-[1.25rem] text-sm leading-snug text-muted-foreground line-clamp-1">
                {subtitleLine}
              </p>
              <div
                className={cn(
                  "flex items-end gap-2 pt-1",
                  type === "movie" ? "justify-end" : "justify-between",
                  !attachShowtimes && "mt-auto",
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
    </motion.div>
  );
};

export default EventCard;