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
  if (!Number.isFinite(d.getTime())) return raw.trim() || "—";
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
  if (!start) return "—";
  const end = event.endDate?.trim();
  if (!end || end === start) return formatEventDateEl(start);
  return `${formatEventDateEl(start)} — ${formatEventDateEl(end)}`;
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

export function formatEventTicketPrice(price: number | undefined): string | null {
  if (price == null || !Number.isFinite(price)) return null;
  const rounded = Math.round(price * 100) % 100 === 0 ? price.toFixed(0) : price.toFixed(2);
  return `${rounded} €`;
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
