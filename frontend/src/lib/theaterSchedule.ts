import type { TheaterWeeklySlot } from "@/lib/api";
import { venueWeekdayLabel, type VenueWeekday } from "@/lib/venuePricing";

const WEEKDAY_ORDER: VenueWeekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const WEEKDAY_SHORT: Record<VenueWeekday, string> = {
  monday: "Δευ",
  tuesday: "Τρί",
  wednesday: "Τετ",
  thursday: "Πέμ",
  friday: "Παρ",
  saturday: "Σάβ",
  sunday: "Κυρ",
};

export type TheaterDaySchedule = {
  weekday: VenueWeekday;
  label: string;
  shortLabel: string;
  times: string[];
};

export function formatTheaterTime(time: string): string {
  const t = time.trim();
  if (!t) return "";
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/** Ομαδοποίηση εβδομαδιαίου προγράμματος ανά μέρα (ταξινομημένα). */
export function groupTheaterWeeklySchedule(slots: TheaterWeeklySlot[]): TheaterDaySchedule[] {
  const byDay = new Map<VenueWeekday, string[]>();
  for (const slot of slots) {
    const day = slot.weekday as VenueWeekday;
    const formatted = formatTheaterTime(slot.time);
    if (!formatted) continue;
    const list = byDay.get(day) ?? [];
    if (!list.includes(formatted)) list.push(formatted);
    byDay.set(day, list);
  }

  const out: TheaterDaySchedule[] = [];
  for (const weekday of WEEKDAY_ORDER) {
    const times = byDay.get(weekday);
    if (!times?.length) continue;
    times.sort((a, b) => a.localeCompare(b));
    out.push({
      weekday,
      label: venueWeekdayLabel(weekday),
      shortLabel: WEEKDAY_SHORT[weekday],
      times,
    });
  }
  return out;
}

/** Σύντομη γραμμή για hero / κάρτα (π.χ. «Τετ 19:00 · Πέμ 20:30»). */
export function theaterScheduleSummary(slots: TheaterWeeklySlot[], maxParts = 4): string | null {
  const days = groupTheaterWeeklySchedule(slots);
  if (!days.length) return null;
  const parts: string[] = [];
  for (const day of days) {
    for (const time of day.times) {
      parts.push(`${day.shortLabel} ${time}`);
      if (parts.length >= maxParts) break;
    }
    if (parts.length >= maxParts) break;
  }
  const extra =
    days.reduce((n, d) => n + d.times.length, 0) > parts.length
      ? ` +${days.reduce((n, d) => n + d.times.length, 0) - parts.length}`
      : "";
  return parts.join(" · ") + extra;
}
