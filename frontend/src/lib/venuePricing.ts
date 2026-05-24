import type { StrapiShowtime, StrapiVenue } from "@/lib/api";

export type VenueWeekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface VenueDayPrice {
  weekday: VenueWeekday;
  price: number;
  priceStudent?: number;
}

const WEEKDAY_ORDER: VenueWeekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const WEEKDAY_LABELS: Record<VenueWeekday, string> = {
  monday: "Δευτέρα",
  tuesday: "Τρίτη",
  wednesday: "Τετάρτη",
  thursday: "Πέμπτη",
  friday: "Παρασκευή",
  saturday: "Σάββατο",
  sunday: "Κυριακή",
};

const WEEKDAY_FROM_INTL: Record<string, VenueWeekday> = {
  Monday: "monday",
  Tuesday: "tuesday",
  Wednesday: "wednesday",
  Thursday: "thursday",
  Friday: "friday",
  Saturday: "saturday",
  Sunday: "sunday",
};

export function venueWeekdayLabel(weekday: VenueWeekday): string {
  return WEEKDAY_LABELS[weekday] ?? weekday;
}

export function sortVenueDayPrices(prices: VenueDayPrice[]): VenueDayPrice[] {
  return [...prices].sort(
    (a, b) => WEEKDAY_ORDER.indexOf(a.weekday) - WEEKDAY_ORDER.indexOf(b.weekday),
  );
}

export function parseVenuePrice(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function componentAttrs(item: unknown): Record<string, unknown> | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const attrs = o.attributes;
  if (attrs && typeof attrs === "object") return attrs as Record<string, unknown>;
  return o;
}

const VALID_WEEKDAYS = new Set<string>(WEEKDAY_ORDER);

export function mapVenueDayPrices(raw: unknown): VenueDayPrice[] {
  if (!Array.isArray(raw)) return [];
  const out: VenueDayPrice[] = [];
  for (const item of raw) {
    const attrs = componentAttrs(item);
    if (!attrs) continue;
    const wd = typeof attrs.weekday === "string" ? attrs.weekday.trim().toLowerCase() : "";
    if (!VALID_WEEKDAYS.has(wd)) continue;
    const price = parseVenuePrice(attrs.price);
    if (price == null) continue;
    const priceStudent = parseVenuePrice(attrs.price_student);
    out.push({
      weekday: wd as VenueWeekday,
      price,
      ...(priceStudent != null ? { priceStudent } : {}),
    });
  }
  return sortVenueDayPrices(out);
}

/** Ημέρα εβδομάδας για datetime προβολής (τοπική ημερολογιακή μέρα, όπως στο υπόλοιπο site). */
export function weekdayFromShowtimeDatetime(iso: string): VenueWeekday | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const name = local.toLocaleDateString("en-US", { weekday: "long" });
  return WEEKDAY_FROM_INTL[name] ?? null;
}

export function resolveShowtimePricing(
  datetime: string,
  venueDayPrices: VenueDayPrice[] | undefined,
  legacyShowtimePrice?: number,
): { regular?: number; student?: number } {
  const wd = weekdayFromShowtimeDatetime(datetime);
  if (wd && venueDayPrices?.length) {
    const row = venueDayPrices.find((p) => p.weekday === wd);
    if (row) {
      return {
        regular: row.price,
        ...(row.priceStudent != null ? { student: row.priceStudent } : {}),
      };
    }
  }
  if (legacyShowtimePrice != null) return { regular: legacyShowtimePrice };
  return {};
}

export function formatEuroPrice(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(2)} €`;
}

/** Τιμή προβολής: πρώτα ημέρα στον χώρο, αλλιώς τιμή στην εγγραφή προβολής (παλιό CMS). */
export function resolvePricingForShowtime(
  st: Pick<StrapiShowtime, "datetime" | "price" | "priceStudent">,
  venue?: StrapiVenue | null,
): { regular?: number; student?: number } {
  if (venue?.dayPrices?.length) {
    return resolveShowtimePricing(st.datetime, venue.dayPrices, st.price);
  }
  return {
    ...(st.price != null ? { regular: st.price } : {}),
    ...(st.priceStudent != null ? { student: st.priceStudent } : {}),
  };
}
