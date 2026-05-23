import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StrapiVenue } from "@/lib/api";
import { isValidExternalUrl } from "@/lib/venueResolve";

type VenueBookingLinkProps = {
  venue?: StrapiVenue;
  className?: string;
  compact?: boolean;
  /** Κουμπί στην κορυφή σελίδας προγράμματος χώρου. */
  variant?: "inline" | "button";
  /** Προεπιλογή: «Κράτηση» σε button, «Κάνε κράτηση εδώ» σε inline. */
  label?: string;
};

/** Σύνδεσμος κράτησης (CMS `more_link`). */
export default function VenueBookingLink({
  venue,
  className,
  compact = false,
  variant = "inline",
  label,
}: VenueBookingLinkProps) {
  const url = isValidExternalUrl(venue?.moreLink) ? venue!.moreLink.trim() : null;
  if (!url) return null;

  const isButton = variant === "button";
  const text = label ?? (isButton ? "Κράτηση" : "Κάνε κράτηση εδώ");

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold transition-colors",
        isButton
          ? "rounded-lg bg-[#13143E] px-4 py-2.5 text-sm text-white shadow-sm hover:bg-[#13143E]/90"
          : "text-[#13143E] hover:text-[#13143E]/75",
        !isButton && (compact ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm"),
        className,
      )}
    >
      {text}
      <ExternalLink
        className={cn("shrink-0", isButton ? "h-4 w-4 opacity-90" : "opacity-70", compact && !isButton ? "h-3 w-3" : "h-3.5 w-3.5")}
        aria-hidden
      />
    </a>
  );
}
