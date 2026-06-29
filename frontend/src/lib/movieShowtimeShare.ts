/** Deep link σελίδας ταινίας — highlight προβολής (#showtimes + query). */
export function buildMovieShowtimeShareUrl(
  movieSlug: string,
  opts?: { showtimeId?: string | number; venueSlug?: string; datetime?: string },
): string {
  const slug = movieSlug.trim();
  if (!slug) return "/movies";
  const params = new URLSearchParams();
  const stId = opts?.showtimeId != null ? String(opts.showtimeId).trim() : "";
  if (stId) {
    params.set("st", stId);
  } else if (opts?.datetime?.trim()) {
    params.set("at", opts.datetime.trim());
    if (opts.venueSlug?.trim()) params.set("venue", opts.venueSlug.trim());
  }
  const qs = params.toString();
  return `/movies/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}#showtimes`;
}

export type MovieShowtimeDeepLink = {
  showtimeId?: string;
  venueSlug?: string;
  datetime?: string;
};

export function parseMovieShowtimeDeepLink(search: string): MovieShowtimeDeepLink {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const stRaw = params.get("st")?.trim();
  const showtimeId = stRaw || undefined;
  const datetime = params.get("at")?.trim() || undefined;
  const venueSlug = params.get("venue")?.trim() || undefined;
  return { showtimeId, datetime, venueSlug };
}

export function formatShowtimeShareLabel(datetime: string, venueName?: string): string {
  const d = new Date(datetime);
  if (Number.isNaN(d.getTime())) return venueName?.trim() || "Προβολή";
  const when = d.toLocaleString("el-GR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const venue = venueName?.trim();
  return venue ? `${when} · ${venue}` : when;
}
