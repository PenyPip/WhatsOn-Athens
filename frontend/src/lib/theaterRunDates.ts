import type { StrapiTheaterShow } from "@/lib/api";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** CMS date (YYYY-MM-DD) → τοπική ημέρα 00:00. */
export function parseTheaterRunDate(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  const s = typeof raw === "string" ? raw.trim().slice(0, 10) : String(raw).trim().slice(0, 10);
  return DATE_ONLY.test(s) ? s : null;
}

function dayStartMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function ymdToMs(ymd: string): number {
  const [y, m, day] = ymd.split("-").map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) return NaN;
  return new Date(y, m - 1, day).getTime();
}

/** Εμφάνιση στο site: σήμερα μέσα στο [runStart, runEnd] (κλειστά· κενά = χωρίς όριο). */
export function isTheaterShowVisible(
  show: Pick<StrapiTheaterShow, "runStart" | "runEnd">,
  now = new Date(),
): boolean {
  const today = dayStartMs(now);
  const start = show.runStart ? ymdToMs(show.runStart) : null;
  const end = show.runEnd ? ymdToMs(show.runEnd) : null;
  if (start != null && Number.isFinite(start) && today < start) return false;
  if (end != null && Number.isFinite(end) && today > end) return false;
  return true;
}

export function filterVisibleTheaterShows(
  shows: readonly StrapiTheaterShow[],
  now = new Date(),
): StrapiTheaterShow[] {
  return shows.filter((s) => isTheaterShowVisible(s, now));
}

function formatRunDay(ymd: string): string {
  const ms = ymdToMs(ymd);
  if (!Number.isFinite(ms)) return ymd;
  return new Date(ms).toLocaleDateString("el-GR", { day: "numeric", month: "short", year: "numeric" });
}

/** Κείμενο περιόδου για σελίδα παράστασης (προαιρετικό). */
export function formatTheaterRunPeriod(show: Pick<StrapiTheaterShow, "runStart" | "runEnd">): string | null {
  const start = show.runStart;
  const end = show.runEnd;
  if (start && end) return `${formatRunDay(start)} – ${formatRunDay(end)}`;
  if (start) return `Από ${formatRunDay(start)}`;
  if (end) return `Έως ${formatRunDay(end)}`;
  return null;
}
