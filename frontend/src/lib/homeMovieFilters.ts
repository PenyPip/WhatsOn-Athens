import { venueLooksSummerOutdoor, type StrapiMovie, type StrapiShowtime, type StrapiVenue } from "@/lib/api";

function mappedVenueIsSummerOutdoor(v: StrapiVenue): boolean {
  if (v.summerOutdoor) return true;
  return venueLooksSummerOutdoor({
    summer_outdoor: v.summerOutdoor,
    name: v.name,
    type: v.type,
  });
}

function showtimeIsSummerOutdoor(showtime: StrapiShowtime, venues: StrapiVenue[] | undefined): boolean {
  if (showtime.summerScreening) return true;
  if (showtime.venueSummerOutdoor) return true;
  if (!venues?.length || showtime.venueId == null) return false;
  const v = venues.find((x) => Number(x.id) === Number(showtime.venueId));
  return v ? mappedVenueIsSummerOutdoor(v) : false;
}

/** Όταν η γραμμή `/movies` λείπει (π.χ. draft ταινία) αλλά η προβολή φέρνει slug + τίτλο. */
function movieStubFromShowtime(slug: string, st: StrapiShowtime | undefined): StrapiMovie | null {
  if (!st) return null;
  const title =
    typeof st.movieTitle === "string" && st.movieTitle.trim() ? st.movieTitle.trim() : slug;
  const id =
    st.movieId != null && Number.isFinite(Number(st.movieId)) ? Number(st.movieId) : 0;
  return {
    id,
    documentId: "",
    slug,
    title,
    director: "—",
    cast: [],
    genre: "",
    duration: 0,
    language: "",
    ageRating: "",
    synopsis: "",
    criticScore: 0,
    releaseDate: "",
    isNew: false,
  };
}

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeekSunday(d: Date): Date {
  const mon = startOfWeekMonday(d);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return sun;
}

function isoInCalendarWeek(dt: Date, reference: Date): boolean {
  const t = dt.getTime();
  return t >= startOfWeekMonday(reference).getTime() && t <= endOfWeekSunday(reference).getTime();
}

/** Ταινίες με τουλάχιστον μία προβολή που σημαίνεται ως θερινός εξωτερικός χώρος. */
export function moviesWithSummerOutdoorShowtime(
  movies: StrapiMovie[],
  showtimes: StrapiShowtime[],
  venues?: StrapiVenue[],
): StrapiMovie[] {
  const slugsOrdered: string[] = [];
  const seen = new Set<string>();
  /** Πρώτη χρήσιμη προβολή ανά slug (για τίτλο όταν λείπει η ταινία από τη λίστα). */
  const slugToShowtime = new Map<string, StrapiShowtime>();
  for (const st of showtimes) {
    if (!showtimeIsSummerOutdoor(st, venues)) continue;
    /** Μόνο γραμμές που δείχνουν ταινία (όχι αμιγώς θέατρο μέσω showtime χωρίς movie). */
    if (st.movieSlug == null && st.movieId == null) continue;
    const slug =
      st.movieSlug ??
      (st.movieId != null ? movies.find((m) => Number(m.id) === Number(st.movieId))?.slug : undefined);
    if (!slug) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    slugToShowtime.set(slug, st);
    slugsOrdered.push(slug);
  }
  return slugsOrdered
    .map((slug) => {
      const hit = movies.find((m) => m.slug === slug);
      if (hit) return hit;
      return movieStubFromShowtime(slug, slugToShowtime.get(slug));
    })
    .filter((m): m is StrapiMovie => Boolean(m));
}

/** Ταινίες με προβολή (ημερομηνία) μέσα στην τρέχουσα εβδομάδα (Δευ–Κυρ, τοπικά). */
export function moviesWithShowtimeThisWeek(movies: StrapiMovie[], showtimes: StrapiShowtime[], now = new Date()): StrapiMovie[] {
  const slugsOrdered: string[] = [];
  const seen = new Set<string>();
  const slugToShowtime = new Map<string, StrapiShowtime>();
  for (const st of showtimes) {
    if (st.movieSlug == null && st.movieId == null) continue;
    const slug =
      st.movieSlug ?? (st.movieId != null ? movies.find((m) => Number(m.id) === Number(st.movieId))?.slug : undefined);
    if (!slug) continue;
    const dt = new Date(st.datetime);
    if (Number.isNaN(dt.getTime()) || !isoInCalendarWeek(dt, now)) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    slugToShowtime.set(slug, st);
    slugsOrdered.push(slug);
  }
  return slugsOrdered
    .map((slug) => {
      const hit = movies.find((m) => m.slug === slug);
      if (hit) return hit;
      return movieStubFromShowtime(slug, slugToShowtime.get(slug));
    })
    .filter((m): m is StrapiMovie => Boolean(m));
}

/** Ταινίες με τουλάχιστον μία προβολή σήμερα (τοπικό ημερολόγιο). */
export function moviesWithShowtimeToday(movies: StrapiMovie[], showtimes: StrapiShowtime[], now = new Date()): StrapiMovie[] {
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const slugsOrdered: string[] = [];
  const seen = new Set<string>();
  const slugToShowtime = new Map<string, StrapiShowtime>();
  for (const st of showtimes) {
    if (st.movieSlug == null && st.movieId == null) continue;
    const slug =
      st.movieSlug ?? (st.movieId != null ? movies.find((m) => Number(m.id) === Number(st.movieId))?.slug : undefined);
    if (!slug) continue;
    const dt = new Date(st.datetime);
    if (Number.isNaN(dt.getTime()) || dt.getTime() < dayStart.getTime() || dt.getTime() >= dayEnd.getTime()) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    slugToShowtime.set(slug, st);
    slugsOrdered.push(slug);
  }
  return slugsOrdered
    .map((slug) => {
      const hit = movies.find((m) => m.slug === slug);
      if (hit) return hit;
      return movieStubFromShowtime(slug, slugToShowtime.get(slug));
    })
    .filter((m): m is StrapiMovie => Boolean(m));
}

/** Ταινίες με `is_new` στο Strapi. */
export function moviesMarkedNew(movies: StrapiMovie[]): StrapiMovie[] {
  return movies.filter((m) => m.isNew === true);
}
