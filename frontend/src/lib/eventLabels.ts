import type { StrapiEvent, StrapiEventType } from "@/lib/api";

export const eventTypeLabels: Record<StrapiEventType, string> = {
  cinema: "Κινηματογράφος",
  theater: "Θέατρο",
  music: "Μουσική",
  art: "Τέχνη",
  food: "Φαγητό",
  other: "Άλλο",
};

export function formatEventDateEl(raw: string): string {
  const d = new Date(`${raw.trim().slice(0, 10)}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return raw.trim() || "-";
  return d.toLocaleDateString("el-GR", { day: "numeric", month: "long", year: "numeric" });
}

/** Strapi time → «19:30». */
export function formatEventTimeEl(raw: string | undefined): string {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!t) return "";
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

export function formatEventDateRange(event: Pick<StrapiEvent, "startDate" | "endDate">): string {
  const start = event.startDate?.trim();
  if (!start) return "-";
  const end = event.endDate?.trim();
  if (!end || end === start) return formatEventDateEl(start);
  return `${formatEventDateEl(start)} - ${formatEventDateEl(end)}`;
}

const EVENT_MONTHS_SHORT = ["Ιαν", "Φεβ", "Μαρ", "Απρ", "Μαΐ", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"];

function parseEventYmd(raw: string | undefined): { y: number; m: number; d: number } | null {
  const match = String(raw || "").trim().slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

/** Σύντομο εύρος για κάρτες: «9–11 Οκτ 2026», «30 Σεπ – 11 Οκτ 2026». */
export function formatEventDateRangeCompact(event: Pick<StrapiEvent, "startDate" | "endDate">): string {
  const start = parseEventYmd(event.startDate);
  if (!start) return formatEventDateRange(event);
  const end = parseEventYmd(event.endDate);
  const startMonth = EVENT_MONTHS_SHORT[start.m - 1];
  if (!end || (end.y === start.y && end.m === start.m && end.d === start.d)) {
    return `${start.d} ${startMonth} ${start.y}`;
  }
  const endMonth = EVENT_MONTHS_SHORT[end.m - 1];
  if (start.y === end.y && start.m === end.m) return `${start.d}–${end.d} ${startMonth} ${start.y}`;
  if (start.y === end.y) return `${start.d} ${startMonth} – ${end.d} ${endMonth} ${start.y}`;
  return `${start.d} ${startMonth} ${start.y} – ${end.d} ${endMonth} ${end.y}`;
}

function safeHttpUrl(raw: string | undefined): string {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!t) return "";
  try {
    const url = new URL(t);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    return "";
  }
  return "";
}

/** Ελεύθερη τοποθεσία. Αν λείπει, όνομα/διεύθυνση συνδεδεμένου σινεμά ή θεάτρου. */
export function eventLocationLabel(
  event: Pick<StrapiEvent, "location" | "venue">,
): string {
  const loc = event.location?.trim();
  if (loc) return loc;
  const name = event.venue?.name?.trim() || "";
  const address = event.venue?.address?.trim() || "";
  if (name && address && !name.includes(address)) return `${name} · ${address}`;
  if (name) return name;
  if (address) return address;
  return "";
}

/** Σύνδεσμος πινέζας. Το πεδίο της τοποθεσίας· αν λείπει κείμενο τοποθεσίας, ο χάρτης του σινεμά/θεάτρου. */
export function eventLocationMapsUrl(
  event: Pick<StrapiEvent, "location" | "locationMapsUrl" | "venue">,
): string {
  const own = safeHttpUrl(event.locationMapsUrl);
  if (own) return own;
  if (event.location?.trim()) return "";
  return safeHttpUrl(event.venue?.googleMapsUrl);
}

export function formatEventScheduleLine(
  event: Pick<StrapiEvent, "startDate" | "endDate" | "startTime" | "endTime">,
): string {
  const datePart = formatEventDateRange(event);
  const startT = formatEventTimeEl(event.startTime);
  const endT = formatEventTimeEl(event.endTime);
  if (!startT) return datePart;
  if (endT) return `${datePart} · ${startT}–${endT}`;
  return `${datePart} · ${startT}`;
}

/** Ίδιο με το αναλυτικό, αλλά με σύντομη ημερομηνία για τις κάρτες. */
export function formatEventWhenCompact(
  event: Pick<StrapiEvent, "startDate" | "endDate" | "startTime" | "endTime">,
): string {
  const datePart = formatEventDateRangeCompact(event);
  const startT = formatEventTimeEl(event.startTime);
  const endT = formatEventTimeEl(event.endTime);
  if (!startT || datePart === "-") return datePart;
  if (endT) return `${datePart} · ${startT}–${endT}`;
  return `${datePart} · ${startT}`;
}

export function formatEventTicketPrice(price: number | undefined): string | null {
  if (price == null || !Number.isFinite(price)) return null;
  if (price === 0) return "Δωρεάν";
  const rounded = Math.round(price * 100) % 100 === 0 ? price.toFixed(0) : price.toFixed(2);
  return `${rounded} €`;
}

/** Δωρεάν όταν τιμή=0 ή tag «δωρεάν» / «free». */
export function eventIsFree(
  event: Pick<StrapiEvent, "ticketPrice" | "tags">,
): boolean {
  if (event.ticketPrice === 0) return true;
  return (event.tags || []).some((tag) => {
    const t = String(tag || "")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .trim();
    return t === "δωρεαν" || t === "free" || t === "δωρεαν/free" || t.startsWith("δωρεαν");
  });
}

/** Ανάγνωση τίτλου από slug (π.χ. παλιά events χωρίς title_el στο CMS). */
export function eventTitleFromSlug(slug: string | undefined): string {
  const s = typeof slug === "string" ? slug.trim() : "";
  if (!s) return "";
  return s
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function eventHasDisplayableInfo(
  event: Pick<StrapiEvent, "titleEl" | "titleEn" | "slug" | "startDate" | "synopsisEl">,
  options?: { fallbackTitle?: string },
): boolean {
  if (eventDisplayTitle(event, options)) return true;
  if (event.startDate?.trim()) return true;
  if (event.synopsisEl?.trim()) return true;
  return Boolean(event.slug?.trim());
}

export function eventDisplayTitle(
  event: Pick<StrapiEvent, "titleEl" | "titleEn" | "slug">,
  options?: { fallbackTitle?: string },
): string {
  const el = event.titleEl?.trim();
  if (el) return el;
  const en = event.titleEn?.trim();
  if (en) return en;
  const fallback = options?.fallbackTitle?.trim();
  if (fallback) return fallback;
  return eventTitleFromSlug(event.slug);
}

export function eventPath(slug: string): string {
  const s = slug.trim();
  return s ? `/events/${encodeURIComponent(s)}` : "/events";
}

export function eventSecondaryTitle(event: Pick<StrapiEvent, "titleEl" | "titleEn">): string | undefined {
  const en = event.titleEn?.trim();
  const el = event.titleEl?.trim();
  if (!en || !el || en.toLocaleLowerCase("en") === el.toLocaleLowerCase("el")) return undefined;
  return en;
}
