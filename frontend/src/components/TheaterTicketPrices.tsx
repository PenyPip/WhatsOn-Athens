import { Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StrapiTheaterShow } from "@/lib/api";
import {
  resolveTheaterTicketPrices,
  theaterHasTicketPrices,
  theaterPriceLabel,
  type TheaterTicketPrices,
} from "@/lib/theaterPricing";

type TheaterTicketPricesProps = {
  show: Pick<StrapiTheaterShow, "ticketPrice" | "ticketPriceFrom" | "ticketPriceTo">;
  variant?: "card" | "hero" | "inline";
  className?: string;
};

export function TheaterTicketPricesDisplay({
  prices,
  variant = "card",
  className,
}: {
  prices: TheaterTicketPrices;
  variant?: "card" | "hero" | "inline";
  className?: string;
}) {
  const label = theaterPriceLabel(prices);
  if (!label || !theaterHasTicketPrices(prices)) return null;

  const isHero = variant === "hero";

  if (variant === "inline") {
    return (
      <p
        className={cn(
          "tabular-nums text-base font-semibold text-foreground md:text-lg",
          className,
        )}
      >
        {label}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5",
        isHero
          ? "border-white/20 bg-white/10 backdrop-blur-sm"
          : "border-[#13143E]/15 bg-[#13143E]/[0.04]",
        className,
      )}
    >
      <Ticket
        className={cn("h-4 w-4 shrink-0", isHero ? "text-amber-200/80" : "text-[#13143E]/60")}
        aria-hidden
      />
      <span
        className={cn(
          "tabular-nums font-semibold",
          isHero ? "text-lg text-amber-100 md:text-xl" : "text-base text-foreground md:text-lg",
        )}
      >
        {label}
      </span>
    </div>
  );
}

export default function TheaterTicketPrices({ show, variant = "card", className }: TheaterTicketPricesProps) {
  const prices = resolveTheaterTicketPrices(show);
  return <TheaterTicketPricesDisplay prices={prices} variant={variant} className={className} />;
}

/** Τιμές εισιτηρίων στο hero (χωρίς εβδομαδιαίο πρόγραμμα). */
export function TheaterTicketHeroPreview({
  show,
  className,
}: {
  show: Pick<StrapiTheaterShow, "ticketPrice" | "ticketPriceFrom" | "ticketPriceTo">;
  className?: string;
}) {
  const prices = resolveTheaterTicketPrices(show);
  if (!theaterHasTicketPrices(prices)) return null;
  return (
    <div className={cn("mt-4", className)}>
      <TheaterTicketPricesDisplay prices={prices} variant="hero" />
    </div>
  );
}
