import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StrapiTheaterShow } from "@/lib/api";
import { isValidExternalUrl } from "@/lib/venueResolve";

type TheaterShowMoreLinkProps = {
  show: Pick<StrapiTheaterShow, "moreLink">;
  className?: string;
  compact?: boolean;
  variant?: "inline" | "button" | "hero";
  label?: string;
};

/** Σύνδεσμος περιοδείας / κρατήσεων από CMS `more_link` της παράστασης. */
export default function TheaterShowMoreLink({
  show,
  className,
  compact = false,
  variant = "button",
  label,
}: TheaterShowMoreLinkProps) {
  const url = isValidExternalUrl(show.moreLink) ? show.moreLink.trim() : null;
  if (!url) return null;

  const isHero = variant === "hero";
  const isButton = variant === "button" || isHero;
  const text = label ?? (isHero ? "Δες περιοδεία" : isButton ? "Περιοδεία & εισιτήρια" : "Κάνε κράτηση εδώ");

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold transition-colors",
        isHero &&
          "rounded border border-white/35 bg-white/10 px-5 py-3 text-base text-white hover:bg-white/20",
        isButton && !isHero && "rounded-lg bg-[#13143E] px-4 py-2.5 text-sm text-white shadow-sm hover:bg-[#13143E]/90",
        !isButton && "text-[#13143E] hover:text-[#13143E]/75",
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
