import { Link } from "react-router-dom";
import { ExternalLink, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StrapiVenue } from "@/lib/api";
import { isValidExternalUrl, moviesHrefForVenue } from "@/lib/venueResolve";

type CinemaVenueLinksProps = {
  venueName: string;
  venue?: StrapiVenue;
  /** Υπάρχουν θερινές προβολές στην ίδια κάρτα (όχι ξεχωριστό σινεμά). */
  hasSummerScreenings?: boolean;
  /** Μικρότερο UI μέσα σε λίστα προβολών. */
  compact?: boolean;
  className?: string;
};

/** Όνομα σινεμά + σύνδεσμοι προγράμματος & Google Maps. */
export default function CinemaVenueLinks({ venueName, venue, compact = false, className }: CinemaVenueLinksProps) {
  const moviesHref = moviesHrefForVenue(venue);
  const mapsUrl = isValidExternalUrl(venue?.googleMapsUrl) ? venue!.googleMapsUrl.trim() : null;
  const address = venue?.address?.trim();
  const nameEl = moviesHref ? (
    <Link
      to={moviesHref}
      className={cn(
        "font-display font-semibold text-[#13143E] transition-colors hover:text-[#13143E]/80",
        compact ? "text-sm" : "text-sm md:text-base",
      )}
    >
      {venueName}
    </Link>
  ) : (
    <span className={cn("font-display font-semibold text-[#13143E]", compact ? "text-sm" : "text-sm md:text-base")}>
      {venueName}
    </span>
  );

  const actionClass = cn(
    "inline-flex items-center gap-1 rounded-md border font-medium transition-colors",
    compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
    "border-border/80 text-muted-foreground hover:border-[#13143E]/30 hover:text-[#13143E]",
  );

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">{nameEl}</div>
        {(moviesHref || mapsUrl) && (
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {moviesHref ? (
              <Link to={moviesHref} className={actionClass}>
                Πρόγραμμα
              </Link>
            ) : null}
            {mapsUrl ? (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={actionClass}>
                <MapPin className={cn("shrink-0 opacity-80", compact ? "h-3 w-3" : "h-3.5 w-3.5")} aria-hidden />
                Χάρτης
                <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
              </a>
            ) : null}
          </div>
        )}
      </div>
      {address ? (
        <p className={cn("mt-1 flex items-start gap-1 text-muted-foreground", compact ? "text-[10px]" : "text-xs")}>
          <MapPin className="mt-0.5 h-3 w-3 shrink-0 opacity-60" aria-hidden />
          <span>{address}</span>
        </p>
      ) : null}
    </div>
  );
}
