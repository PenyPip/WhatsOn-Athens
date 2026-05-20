import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StrapiVenue } from "@/lib/api";
import { isValidExternalUrl } from "@/lib/venueResolve";

type VenueBookingLinkProps = {
  venue?: StrapiVenue;
  className?: string;
  compact?: boolean;
};

/** Σύνδεσμος κράτησης (CMS `more_link`) — εμφανίζεται δίπλα στις προβολές. */
export default function VenueBookingLink({ venue, className, compact = false }: VenueBookingLinkProps) {
  const url = isValidExternalUrl(venue?.moreLink) ? venue!.moreLink.trim() : null;
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 font-semibold text-[#13143E] transition-colors hover:text-[#13143E]/75",
        compact ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm",
        className,
      )}
    >
      Κάνε κράτηση εδώ
      <ExternalLink className={cn("shrink-0 opacity-70", compact ? "h-3 w-3" : "h-3.5 w-3.5")} aria-hidden />
    </a>
  );
}
