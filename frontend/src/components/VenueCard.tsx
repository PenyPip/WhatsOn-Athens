import { ChevronRight, ExternalLink, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { StrapiVenue } from "@/lib/api";

const cityLabels: Record<string, string> = {
  athens: "Αθήνα",
  thessaloniki: "Θεσσαλονίκη",
  other: "Άλλο",
};

function cityLabel(v: StrapiVenue): string {
  const c = typeof v.city === "string" ? v.city.trim().toLowerCase() : "";
  return cityLabels[c] ?? v.city ?? "";
}

export interface VenueCardProps {
  venue: StrapiVenue;
  /** Αν υπάρχει, κάθε χτύπημα στην κάρτα (εκτός από εξωτερικά links) οδηγεί στις ταινίες με φίλτρο χώρου. */
  moviesHref?: string;
  variant?: "page" | "spotlight";
  /** Στη γραμμή carousel χρειάζεται σταθερό πλάτος· σε grid/grid-like γονέα χρησιμοποίησε `grid` για να γεμίζει το κελί. */
  layout?: "carousel" | "grid";
  className?: string;
}

const VenueCard = ({ venue, moviesHref, variant = "page", layout = "carousel", className }: VenueCardProps) => {
  const isSpotlight = variant === "spotlight";
  const headingClass = cn("font-display text-lg font-semibold leading-snug", isSpotlight ? "text-white" : "text-foreground");
  const metaBodyClass = cn("grow space-y-2 text-sm", isSpotlight ? "text-white/55" : "text-muted-foreground");
  const cityClass = cn("text-xs font-medium", isSpotlight ? "text-white/65" : "text-foreground");

  const mainContent = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className={headingClass}>{venue.name}</h3>
        <div className="pointer-events-none flex flex-wrap justify-end gap-1.5 shrink-0">
          {venue.type ? (
            <span
              className={cn(
                "px-2 py-0.5 text-[10px] uppercase tracking-wider rounded font-medium",
                isSpotlight ? "border border-white/10 bg-black/35 text-white/90" : "bg-[#111111] text-white",
              )}
            >
              {venue.type}
            </span>
          ) : null}
          {venue.summerOutdoor ? (
            <span className="shrink-0 rounded bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#13143E]">
              θερινό
            </span>
          ) : null}
        </div>
      </div>
      <div className={cn(metaBodyClass, "pointer-events-none")}>
        {venue.address ? (
          <p className="flex items-start gap-2">
            <MapPin className={cn("mt-0.5 h-3.5 w-3.5 flex-shrink-0", isSpotlight ? "text-white/40" : "text-muted-foreground")} />
            <span>{venue.address}</span>
          </p>
        ) : null}
        {venue.seatsTotal > 0 ? (
          <p className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 flex-shrink-0" />
            {venue.seatsTotal} θέσεις
          </p>
        ) : null}
        {cityLabel(venue) ? <p className={cityClass}>{cityLabel(venue)}</p> : null}
      </div>
      {moviesHref ? (
        <p
          className={cn(
            "pointer-events-none mt-auto inline-flex items-center gap-0.5 pt-5 text-xs font-medium leading-snug",
            isSpotlight ? "text-amber-200/95" : "text-primary",
          )}
        >
          Πρόγραμμα ταινιών σε αυτόν τον χώρο
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
        </p>
      ) : null}
    </div>
  );

  const hasFooterLinks = Boolean(venue.moreLink || venue.googleMapsUrl);

  const footerOuter = hasFooterLinks ? (
    <div
      className={cn(
        "relative z-[2] mt-auto flex shrink-0 flex-wrap gap-2 border-t pt-4 pointer-events-none",
        isSpotlight ? "border-white/10" : "border-border",
      )}
    >
      {venue.moreLink ? (
        <a
          href={venue.moreLink}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "pointer-events-auto inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
            isSpotlight
              ? "border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
              : "border-border bg-background text-foreground hover:border-foreground/40 hover:bg-secondary/80",
          )}
        >
          Περισσότερα
          <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </a>
      ) : null}
      {venue.googleMapsUrl ? (
        <a
          href={venue.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "pointer-events-auto inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors",
            isSpotlight
              ? "border-white/15 text-white/65 hover:border-white/30 hover:text-white"
              : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
          )}
        >
          Χάρτης
          <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </a>
      ) : null}
    </div>
  ) : null;

  /** Στο spotlight χωρίς `.card-elevated` (φωτεινό --card). Σταθερό min ύψος ώστε όλες οι κάρτες να ευθυγραμμίζονται. */
  const cardMinH = "min-h-[296px]";
  const spotlightShell = cn(
    "relative flex h-full flex-col rounded-lg border border-white/12 bg-black/50 p-6 text-left shadow-[0_8px_30px_rgba(0,0,0,0.25)]",
    cardMinH,
  );
  const pageShell = cn(
    "card-elevated relative flex h-full flex-col p-6 text-left transition-colors",
    cardMinH,
    moviesHref && "hover:border-primary/35",
  );

  const cardShell = (
    <div
      className={cn(
        isSpotlight ? spotlightShell : pageShell,
        className,
      )}
    >
      {moviesHref ? (
        <>
          <Link
            to={moviesHref}
            className="absolute inset-0 z-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400"
            aria-label={`Πρόγραμμα ταινιών στο χώρο ${venue.name}`}
          />
          <div className="relative z-[1] flex min-h-0 flex-1 flex-col pointer-events-none">
            {mainContent}
          </div>
          {footerOuter}
        </>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col">{mainContent}</div>
          {footerOuter}
        </>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "flex h-full flex-col",
        moviesHref && layout === "carousel" && "min-w-[280px] max-w-[320px] shrink-0 md:min-w-[300px] md:max-w-[340px]",
        moviesHref && layout === "grid" && "min-w-0 w-full",
      )}
    >
      {cardShell}
    </div>
  );
};

export default VenueCard;
