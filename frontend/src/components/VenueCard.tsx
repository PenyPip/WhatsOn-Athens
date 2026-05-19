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
  /** Πυκνότερη κάρτα (λιγότερο κενό, μικρότερα paddings)· χρήσιμο σε grid στην αρχική. */
  compact?: boolean;
  className?: string;
}

const VenueCard = ({
  venue,
  moviesHref,
  variant = "page",
  layout = "carousel",
  compact = false,
  className,
}: VenueCardProps) => {
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

  const mainContent = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn("flex items-start justify-between gap-2", compact ? "mb-2" : "mb-3")}>
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
            "pointer-events-none mt-auto inline-flex items-center gap-0.5 font-medium leading-snug",
            compact ? "pt-3 text-[11px]" : "pt-5 text-xs",
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
        "relative z-[2] mt-auto flex shrink-0 flex-wrap border-t pointer-events-none",
        compact ? "gap-1.5 pt-3" : "gap-2 pt-4",
        isSpotlight ? "border-white/10" : "border-border",
      )}
    >
      {venue.moreLink ? (
        <a
          href={venue.moreLink}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "pointer-events-auto inline-flex items-center gap-1.5 rounded-md border font-medium transition-colors",
            compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
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
            "pointer-events-auto inline-flex items-center gap-1.5 rounded-md border transition-colors",
            compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
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

  /** Στο spotlight χωρίς `.card-elevated`. Στην προεπιλογή χρησιμοποιείται min ύψος carousel· σε compact/grid όχι. */
  const cardMinH = compact ? "" : "min-h-[296px]";
  const spotlightShell = cn(
    "relative flex h-full flex-col rounded-xl border text-left shadow-[0_4px_24px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-[border-color,box-shadow]",
    compact
      ? "border-white/[0.12] bg-gradient-to-b from-white/[0.06] to-black/55 p-4 hover:border-amber-400/25 hover:shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
      : "border-white/12 bg-black/50 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.25)]",
    !compact && cardMinH,
  );
  const pageShell = cn(
    "card-elevated relative flex h-full flex-col text-left transition-colors",
    compact ? "p-4" : "p-6 min-h-[296px]",
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
            className={cn(
              "absolute inset-0 z-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400",
              compact ? "rounded-xl" : "rounded-lg",
            )}
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
        moviesHref && layout === "carousel" && !compact && "min-w-[260px] max-w-[280px] shrink-0 sm:min-w-[280px] sm:max-w-[300px]",
        moviesHref && layout === "grid" && "min-w-0 w-full",
      )}
    >
      {cardShell}
    </div>
  );
};

export default VenueCard;
