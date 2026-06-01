import { Calendar, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { StrapiVenue } from "@/lib/api";
import { isTouringTheaterVenue } from "@/lib/touringVenues";
import { programHrefForVenue, venueKindLabel } from "@/lib/venueType";
import VenueBookingLink from "@/components/VenueBookingLink";
import { isValidExternalUrl, resolveGoogleMapsHref } from "@/lib/venueResolve";

const cityLabels: Record<string, string> = {
  athens: "Αθήνα",
  thessaloniki: "Θεσσαλονίκη",
  other: "Άλλο",
};

function cityLabel(v: StrapiVenue): string {
  const c = typeof v.city === "string" ? v.city.trim().toLowerCase() : "";
  return cityLabels[c] ?? v.city ?? "";
}

const actionBtnClass =
  "inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors";

export interface VenueCardProps {
  venue: StrapiVenue;
  moviesHref?: string;
  variant?: "page" | "spotlight";
  layout?: "carousel" | "grid";
  compact?: boolean;
  /** Εμφάνιση εύρους επερχόμενων προβολών (π.χ. σελίδα /venues). */
  showProgramDates?: boolean;
  programDatesLabel?: string | null;
  programDatesLoading?: boolean;
  /** Αρχική / περιοδείες: χωρίς εσωτερικό πρόγραμμα, έμφαση στο more_link. */
  tourMode?: boolean;
  className?: string;
}

const VenueCard = ({
  venue,
  moviesHref,
  variant = "page",
  layout = "carousel",
  compact = false,
  showProgramDates = false,
  programDatesLabel,
  programDatesLoading = false,
  tourMode = false,
  className,
}: VenueCardProps) => {
  const isTour = tourMode || isTouringTheaterVenue(venue);
  const programHref = isTour ? undefined : (moviesHref ?? programHrefForVenue(venue));
  const programLabel = venue.type === "theater" ? "Παραστάσεις" : "Πρόγραμμα";
  const isSpotlight = variant === "spotlight";
  const headingClass = cn(
    "font-display font-semibold leading-snug",
    compact ? "text-base" : "text-lg",
    isSpotlight ? "text-white" : "text-foreground",
  );
  const metaBodyClass = cn(
    "grow",
    compact ? "space-y-1.5 text-xs leading-relaxed" : "space-y-2 text-sm",
    isSpotlight ? "text-white/55" : "text-muted-foreground",
  );
  const cityClass = cn(compact ? "text-[11px]" : "text-xs font-medium", isSpotlight ? "text-white/65" : "text-foreground");

  const programBtnClass = cn(
    actionBtnClass,
    isSpotlight
      ? "border-[#13143E]/35 bg-[#13143E]/90 font-semibold text-white hover:bg-[#13143E]"
      : "border-[#13143E]/35 bg-[#13143E]/[0.06] font-semibold text-[#13143E] hover:bg-[#13143E]/10",
    compact && "px-2.5 py-1.5 text-xs",
  );

  const mapsUrl = resolveGoogleMapsHref(venue.googleMapsUrl, venue.address);
  const hasActions = Boolean(programHref || venue.moreLink);

  const cardMinH = compact ? "" : "min-h-[296px]";
  const spotlightShell = cn(
    "relative flex h-full flex-col rounded-xl border text-left shadow-[0_4px_24px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-[border-color,box-shadow]",
    compact
      ? "border-white/[0.12] bg-gradient-to-b from-white/[0.06] to-black/55 p-4 hover:border-amber-400/25 hover:shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
      : "border-white/12 bg-black/50 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.25)]",
    !compact && cardMinH,
  );
  const pageShell = cn("card-elevated relative flex h-full flex-col text-left transition-colors", compact ? "p-4" : "p-6 min-h-[296px]");

  return (
    <div
      className={cn(
        "flex h-full flex-col",
        programHref && layout === "carousel" && !compact && "min-w-[260px] max-w-[280px] shrink-0 sm:min-w-[280px] sm:max-w-[300px]",
        programHref && layout === "grid" && "min-w-0 w-full",
      )}
    >
      <div className={cn(isSpotlight ? spotlightShell : pageShell, className)}>
        <div className={cn("flex items-start justify-between gap-2", compact ? "mb-2" : "mb-3")}>
          <h3 className={headingClass}>{venue.name}</h3>
          <div className="flex flex-wrap justify-end gap-1.5 shrink-0">
            {venueKindLabel(venue.type) ? (
              <span
                className={cn(
                  "px-2 py-0.5 text-[10px] uppercase tracking-wider rounded font-medium",
                  isSpotlight ? "border border-white/10 bg-black/35 text-white/90" : "bg-[#111111] text-white",
                )}
              >
                {venueKindLabel(venue.type)}
              </span>
            ) : null}
            {isTour ? (
              <span className="shrink-0 rounded border border-amber-300/50 bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-100">
                Περιοδεία
              </span>
            ) : null}
            {!isTour && venue.summerOutdoor ? (
              <span className="shrink-0 rounded bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#13143E]">
                θερινό
              </span>
            ) : null}
          </div>
        </div>

        <div className={cn(metaBodyClass, "flex min-h-0 flex-1 flex-col")}>
          {venue.address ? (
            <p className="flex items-start gap-2">
              <MapPin className={cn("mt-0.5 h-3.5 w-3.5 flex-shrink-0", isSpotlight ? "text-white/40" : "text-muted-foreground")} />
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "underline decoration-current/30 underline-offset-2 transition-colors",
                    isSpotlight ? "text-white/80 hover:text-white" : "text-foreground/90 hover:text-foreground",
                  )}
                >
                  {venue.address}
                  <span className="sr-only"> (χάρτης)</span>
                </a>
              ) : (
                <span>{venue.address}</span>
              )}
            </p>
          ) : null}
          {venue.seatsTotal > 0 ? (
            <p className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 flex-shrink-0" />
              {venue.seatsTotal} θέσεις
            </p>
          ) : null}
          {cityLabel(venue) ? <p className={cityClass}>{cityLabel(venue)}</p> : null}
          {showProgramDates && !isTour ? (
            programDatesLoading ? (
              <p className={cn("text-xs", isSpotlight ? "text-white/50" : "text-muted-foreground")}>
                Φόρτωση προγράμματος…
              </p>
            ) : programDatesLabel ? (
              <p className={cn("flex items-start gap-2", isSpotlight ? "text-amber-200/90" : "text-[#13143E]")}>
                <Calendar
                  className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", isSpotlight ? "text-amber-300/80" : "opacity-70")}
                  aria-hidden
                />
                <span className={cn("font-medium leading-snug", compact ? "text-xs" : "text-sm")}>
                  {programDatesLabel}
                </span>
              </p>
            ) : (
              <p className={cn("text-xs leading-relaxed", isSpotlight ? "text-white/45" : "text-muted-foreground")}>
                Δεν υπάρχουν επερχόμενες προβολές
              </p>
            )
          ) : null}
        </div>

        {hasActions ? (
          <div
            className={cn(
              "mt-auto flex flex-wrap gap-3",
              compact ? "pt-3" : "pt-4",
              isSpotlight ? "border-t border-white/10 pt-4" : "border-t border-border pt-4",
            )}
          >
            {programHref ? (
              <Link to={programHref} className={programBtnClass}>
                {programLabel}
              </Link>
            ) : null}
            {isValidExternalUrl(venue.moreLink) ? (
              <VenueBookingLink
                venue={venue}
                variant="button"
                compact={compact}
                label={isTour ? "Δες περιοδεία" : undefined}
                className={cn(
                  compact ? "px-2.5 py-1.5 text-xs" : undefined,
                  isSpotlight && "border-white/20 bg-white/10 text-white hover:bg-white/20",
                )}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default VenueCard;
