import { formatEuroPrice } from "@/lib/venuePricing";
import type { StrapiTheaterShow } from "@/lib/api";

export type TheaterTicketPrices = {
  from?: number;
  to?: number;
};

/** Τιμές από–έως (ή παλιά μοναδική ticket_price). */
export function resolveTheaterTicketPrices(
  show: Pick<StrapiTheaterShow, "ticketPrice" | "ticketPriceFrom" | "ticketPriceTo">,
): TheaterTicketPrices {
  const legacy = show.ticketPrice;
  const from = show.ticketPriceFrom ?? legacy;
  const to = show.ticketPriceTo ?? legacy;
  if (from == null && to == null) return {};
  return { from: from ?? to, to: to ?? from };
}

export function formatEuroPriceRange(from?: number, to?: number): string | null {
  if (from == null && to == null) return null;
  const lo = from ?? to;
  const hi = to ?? from;
  if (lo == null || hi == null) return null;
  if (Math.abs(lo - hi) < 0.005) return formatEuroPrice(lo);
  return `${formatEuroPrice(lo)} – ${formatEuroPrice(hi)}`;
}

export function theaterPriceLabel(prices: TheaterTicketPrices): string | null {
  return formatEuroPriceRange(prices.from, prices.to);
}

export function theaterHasTicketPrices(prices: TheaterTicketPrices): boolean {
  return prices.from != null || prices.to != null;
}
