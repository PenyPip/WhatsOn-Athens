import { movieGenreSlugsToDisplayLine, type StrapiMovie, type StrapiShowtime, type StrapiVenue } from "@/lib/api";
import { showtimeIsUpcoming as showtimeIsUpcomingCore, showtimeOverlapsRange } from "@/lib/showtimeSchedule";
import { isCinemaVenue } from "@/lib/venueType";

/**
 * Εξωτερική/θερινή προβολή — μόνο το πεδίο «θερινή προβολή» στην εγγραφή προβολής (CMS).
 * Το «Θερινό» στο site δεν κληρονομείται από τον χώρο.
 */
export function showtimeIsSummerOutdoor(_showtime: StrapiShowtime, _venues?: StrapiVenue[] | undefined): boolean {
  return Boolean(_showtime.summerScreening);
}

/** Εμφάνιση ετικέτας «Θερινό» δίπλα σε μία προβολή. */
export function showtimeShowsOutdoorLabel(showtime: StrapiShowtime): boolean {
  return Boolean(showtime.summerScreening);
}

/** Έναρξη προβολής ακόμα δεν έχει περάσει (ή εβδομάδα week_block δεν έχει λήξει). */
export function showtimeIsUpcoming(st: StrapiShowtime, now = new Date()): boolean {
  return showtimeIsUpcomingCore(st, now);
}

/**
 * Θερινοί χώροι (CMS) που έχουν τουλάχιστον μία μελλοντική προβολή ταινίας με ένδειξη «θερινής» στο μοντέλο προβολής.
 * Αν κανείς δεν έχει τέτοια προβολή, επιστρέφονται όλοι οι θερινοί για να μην μένει κενή η ενότητα.
 */
export function summerVenuesWithShowtimesOrAll(venues: StrapiVenue[], showtimes: StrapiShowtime[], now = new Date()): StrapiVenue[] {
  const summerVenues = venues
    .filter((v) => isCinemaVenue(v) && v.summerOutdoor)
    .sort((a, b) => a.name.localeCompare(b.name, "el"));
  const idWithSummerShow = new Set<number>();
  for (const st of showtimes) {
    if (st.movieId == null || st.venueId == null) continue;
    if (!showtimeIsUpcoming(st, now)) continue;
    if (!showtimeIsSummerOutdoor(st, venues)) continue;
    idWithSummerShow.add(Number(st.venueId));
  }
  const withShows = summerVenues.filter((v) => idWithSummerShow.has(Number(v.id)));
  return withShows.length > 0 ? withShows : summerVenues;
}

/** Σταθερό id για stubs όταν λείπει movieId — αποφυγή διπλότυπων React keys (παλιά: όλα 0). */
function stubNumericIdFromSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = Math.imul(31, h) + slug.charCodeAt(i);
  const u = h >>> 0;
  return u === 0 ? 1 : u;
}

/** Όταν η γραμμή `/movies` λείπει (π.χ. draft ταινία) αλλά η προβολή φέρνει slug + τίτλο + είδος από `populate[movie]`. */
function movieStubFromShowtime(slug: string, st: StrapiShowtime | undefined): StrapiMovie | null {
  if (!st) return null;
  const title =
    typeof st.movieTitle === "string" && st.movieTitle.trim() ? st.movieTitle.trim() : slug;
  const id =
    st.movieId != null && Number.isFinite(Number(st.movieId))
      ? Number(st.movieId)
      : stubNumericIdFromSlug(slug);
  const genreLine =
    typeof st.movieGenre === "string" && st.movieGenre.trim() ? st.movieGenre.trim() : "";
  const slugs = Array.isArray(st.movieGenreSlugs) ? st.movieGenreSlugs.filter(Boolean) : [];
  return {
    id,
    documentId: "",
    slug,
    title,
    director: "—",
    cast: [],
    genre: genreLine || (slugs.length ? movieGenreSlugsToDisplayLine(slugs) : ""),
    genreSlugs: slugs,
    duration: 0,
    language: "",
    isDubbed: false,
    ageRating: "",
    synopsis: "",
    criticScore: 0,
    releaseDate: "",
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

/** Εβδομάδα κινηματογράφου (συνηθισμένο πρόγραμμα Ελλάδας): Πέμπτη 00:00 έως Τετάρτη 23:59:59.999, ίδια τοπική ζώνη. */
export function startOfCinemaWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay();
  const daysSinceThursday = (dow - 4 + 7) % 7;
  x.setDate(x.getDate() - daysSinceThursday);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfCinemaWeek(d: Date): Date {
  const start = startOfCinemaWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function isoInCalendarWeek(dt: Date, reference: Date): boolean {
  const t = dt.getTime();
  return t >= startOfWeekMonday(reference).getTime() && t <= endOfWeekSunday(reference).getTime();
}

/** Ίδιο όριο με την ενότητα «Θερινά σινεμά» στην αρχική (εβδομάδα σινεμά). */
export function isoInCinemaWeek(dt: Date, reference: Date): boolean {
  const t = dt.getTime();
  return t >= startOfCinemaWeek(reference).getTime() && t <= endOfCinemaWeek(reference).getTime();
}

/** Ταιριάζει τις προβολές που φαίνονται στη γραμμή «Σήμερα» της αρχικής (μόνο όσες δεν έχουν περάσει). */
export function showtimeMatchesHomeToday(st: StrapiShowtime, now = new Date()): boolean {
  const dt = new Date(st.datetime);
  if (Number.isNaN(dt.getTime())) return false;
  if (dt.getTime() < now.getTime()) return false;
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const t = dt.getTime();
  return t >= dayStart.getTime() && t < dayEnd.getTime();
}

/** Ίδια λογική με «Ταινίες της εβδομάδας» (ημερολογιακή Δευ–Κυρ). */
export function showtimeMatchesHomeThisWeek(st: StrapiShowtime, now = new Date()): boolean {
  const dt = new Date(st.datetime);
  return !Number.isNaN(dt.getTime()) && dt.getTime() >= now.getTime() && isoInCalendarWeek(dt, now);
}

/** Προβολή θερινής σινεμά στην τρέχουσα εβδομάδα κινηματογράφου (όπως αρχική). */
export function showtimeMatchesHomeSummerCinemaRow(
  st: StrapiShowtime,
  venues: StrapiVenue[] | undefined,
  now = new Date(),
): boolean {
  const dt = new Date(st.datetime);
  if (Number.isNaN(dt.getTime())) return false;
  if (dt.getTime() < now.getTime()) return false;
  if (!showtimeIsSummerOutdoor(st, venues)) return false;
  return isoInCinemaWeek(dt, now);
}

/**
 * Κλειδί μοναδικό ανά ταινία για σειρές προβολών.
 * Προτιμούμε numeric `movieId` ώστε δύο εγγραφές με το ίδιο slug (λάθος στο CMS) να μη συγχωνεύονται σε μία κάρτα.
 */
function movieShowtimeRowKey(st: StrapiShowtime): string | null {
  const mid = st.movieId != null ? Number(st.movieId) : NaN;
  if (Number.isFinite(mid)) return `id:${mid}`;
  const slug = typeof st.movieSlug === "string" ? st.movieSlug.trim() : "";
  if (slug) return `slug:${slug}`;
  return null;
}

function movieSlugForShowtime(st: StrapiShowtime, movies: StrapiMovie[]): string | undefined {
  const mid = st.movieId != null ? Number(st.movieId) : NaN;
  if (Number.isFinite(mid)) {
    const hit = movies.find((m) => Number(m.id) === mid);
    if (hit?.slug?.trim()) return hit.slug.trim();
  }
  if (typeof st.movieSlug === "string" && st.movieSlug.trim()) return st.movieSlug.trim();
  return undefined;
}

function moviesFromShowtimesOrdered(
  movies: StrapiMovie[],
  showtimes: StrapiShowtime[],
  predicate: (st: StrapiShowtime) => boolean,
): StrapiMovie[] {
  const orderedKeys: string[] = [];
  const seen = new Set<string>();
  const keyToShowtime = new Map<string, StrapiShowtime>();

  for (const st of showtimes) {
    if (!predicate(st)) continue;
    if (st.movieSlug == null && st.movieId == null) continue;
    const key = movieShowtimeRowKey(st);
    if (!key) continue;
    const slug = movieSlugForShowtime(st, movies);
    if (!slug) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    keyToShowtime.set(key, st);
    orderedKeys.push(key);
  }

  return orderedKeys
    .map((key) => {
      const st = keyToShowtime.get(key);
      if (!st) return null;
      const slug = movieSlugForShowtime(st, movies);
      if (!slug) return null;
      const hit =
        key.startsWith("id:")
          ? movies.find((m) => Number(m.id) === Number(key.slice(3)))
          : movies.find((m) => m.slug === slug);
      if (hit) {
        const g = (hit.genre ?? "").trim();
        const fromSt = (st.movieGenre ?? "").trim();
        if (!g && fromSt) {
          return {
            ...hit,
            genre: fromSt,
            genreSlugs:
              st.movieGenreSlugs && st.movieGenreSlugs.length > 0 ? st.movieGenreSlugs : hit.genreSlugs,
          };
        }
        return hit;
      }
      return movieStubFromShowtime(slug, st);
    })
    .filter((m): m is StrapiMovie => Boolean(m));
}

/** Ταινίες με τουλάχιστον μία προβολή που σημαίνεται ως θερινός εξωτερικός χώρος. */
export function moviesWithSummerOutdoorShowtime(
  movies: StrapiMovie[],
  showtimes: StrapiShowtime[],
  venues?: StrapiVenue[],
  now = new Date(),
): StrapiMovie[] {
  return moviesFromShowtimesOrdered(
    movies,
    showtimes,
    (st) => showtimeIsUpcoming(st, now) && showtimeIsSummerOutdoor(st, venues),
  );
}

/**
 * Όπως παραπάνω, αλλά μόνο αν η προβολή πέφτει μέσα στην τρέχουσα «εβδομάδα σινεμά»
 * (Πέμπτη 00:00 έως Τετάρτη τέλος ημέρας — τοπικά).
 */
export function moviesWithSummerOutdoorShowtimeThisCinemaWeek(
  movies: StrapiMovie[],
  showtimes: StrapiShowtime[],
  venues?: StrapiVenue[],
  now = new Date(),
): StrapiMovie[] {
  return moviesFromShowtimesOrdered(movies, showtimes, (st) => {
    const dt = new Date(st.datetime);
    if (Number.isNaN(dt.getTime())) return false;
    if (dt.getTime() < now.getTime()) return false;
    if (!showtimeIsSummerOutdoor(st, venues)) return false;
    return isoInCinemaWeek(dt, now);
  });
}

/** Ταινίες με προβολή (ημερομηνία) μέσα στην τρέχουσα εβδομάδα (Δευ–Κυρ, τοπικά). */
export function moviesWithShowtimeThisWeek(movies: StrapiMovie[], showtimes: StrapiShowtime[], now = new Date()): StrapiMovie[] {
  return moviesFromShowtimesOrdered(movies, showtimes, (st) => {
    const dt = new Date(st.datetime);
    return !Number.isNaN(dt.getTime()) && dt.getTime() >= now.getTime() && isoInCalendarWeek(dt, now);
  });
}

/** Ταινίες με τουλάχιστον μία προβολή σήμερα (τοπικό ημερολόγιο). */
export function moviesWithShowtimeToday(movies: StrapiMovie[], showtimes: StrapiShowtime[], now = new Date()): StrapiMovie[] {
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return moviesFromShowtimesOrdered(movies, showtimes, (st) => {
    const dt = new Date(st.datetime);
    return (
      !Number.isNaN(dt.getTime()) &&
      dt.getTime() >= now.getTime() &&
      dt.getTime() >= dayStart.getTime() &&
      dt.getTime() < dayEnd.getTime()
    );
  });
}

function parseReleaseDateLocal(value: string): Date | null {
  const s = typeof value === "string" ? value.trim() : "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function enrichMoviesWithShowtimeGenre(movies: StrapiMovie[], showtimes: StrapiShowtime[]): StrapiMovie[] {
  if (!movies.length || !showtimes.length) return movies;
  return movies.map((m) => {
    const g = (m.genre ?? "").trim();
    if (g) return m;
    const mid = m.id;
    const slug = typeof m.slug === "string" ? m.slug.trim() : "";
    const st =
      Number.isFinite(mid) && mid > 0
        ? showtimes.find((s) => s.movieId != null && Number(s.movieId) === Number(mid) && (s.movieGenre ?? "").trim())
        : undefined;
    const bySlug =
      !st && slug ? showtimes.find((s) => s.movieSlug === slug && (s.movieGenre ?? "").trim()) : undefined;
    const pick = st ?? bySlug;
    const fromSt = pick?.movieGenre?.trim();
    if (!fromSt) return m;
    return {
      ...m,
      genre: fromSt,
      genreSlug: pick.movieGenreSlugs?.[0] ?? m.genreSlug,
      genreSlugs: pick.movieGenreSlugs?.length ? pick.movieGenreSlugs : m.genreSlugs,
    };
  });
}

/** Ταινίες με ημερομηνία κυκλοφορίας μέσα στις τελευταίες `days` μέρες (τοπικά, συμπεριλαμβανομένης της σήμερας). */
export function moviesReleasedInLastDays(movies: StrapiMovie[], days: number, now = new Date()): StrapiMovie[] {
  if (days < 1) return [];
  const today = startOfLocalDay(now);
  const windowStart = new Date(today);
  windowStart.setDate(windowStart.getDate() - (days - 1));

  const withParsed: { movie: StrapiMovie; release: Date }[] = [];
  for (const movie of movies) {
    const release = parseReleaseDateLocal(movie.releaseDate ?? "");
    if (!release) continue;
    const r0 = startOfLocalDay(release);
    const t = r0.getTime();
    if (t < windowStart.getTime() || t > today.getTime()) continue;
    withParsed.push({ movie, release: r0 });
  }
  withParsed.sort((a, b) => b.release.getTime() - a.release.getTime());
  return withParsed.map((x) => x.movie);
}

/** Ταινίες με ημερομηνία κυκλοφορίας αυστηρά μετά τη σήμερα (τοπικά). Σειρά: πιο κοντινή πρώτη. */
export function moviesWithFutureReleaseDate(movies: StrapiMovie[], now = new Date()): StrapiMovie[] {
  const todayStart = startOfLocalDay(now);
  const withParsed: { movie: StrapiMovie; release: Date }[] = [];
  for (const movie of movies) {
    const release = parseReleaseDateLocal(movie.releaseDate ?? "");
    if (!release) continue;
    const r0 = startOfLocalDay(release);
    if (r0.getTime() <= todayStart.getTime()) continue;
    withParsed.push({ movie, release: r0 });
  }
  withParsed.sort((a, b) => a.release.getTime() - b.release.getTime());
  return withParsed.map((x) => x.movie);
}

/** Άμεσα επόμενη εβδομάδα κινηματογράφου (Πέμπτη 00:00 έως Τετάρτη τέλος ημέρας). Αν έχουμε ήδη μπει στην τρέχουσα, η «επόμενη» είναι η μεθεπόμενη Πέμπτη. */
export function getUpcomingCinemaWeekBounds(now = new Date()): { start: Date; end: Date } {
  let start = startOfCinemaWeek(now);
  if (now.getTime() >= start.getTime()) {
    start = new Date(start);
    start.setDate(start.getDate() + 7);
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function releaseDateInBounds(movie: StrapiMovie, start: Date, end: Date): boolean {
  const release = parseReleaseDateLocal(movie.releaseDate ?? "");
  if (!release) return false;
  const r0 = startOfLocalDay(release).getTime();
  return r0 >= start.getTime() && r0 <= end.getTime();
}

/** Προβολή μέσα στην άμεσα επόμενη εβδομάδα κινηματογράφου (μόνο μελλοντικές ώρες). */
export function showtimeMatchesHomeUpcomingCinemaWeek(st: StrapiShowtime, now = new Date()): boolean {
  const { start, end } = getUpcomingCinemaWeekBounds(now);
  return showtimeOverlapsRange(st, start, end, now);
}

/**
 * Ταινίες της επόμενης εβδομάδας κινηματογράφου: κυκλοφορία ή προβολή μέσα στο διάστημα.
 * Πρώτα με release στην εβδομάδα, μετά με προβολή χωρίς release στην εβδομάδα.
 */
export function moviesForUpcomingCinemaWeek(
  movies: StrapiMovie[],
  showtimes: StrapiShowtime[],
  now = new Date(),
): StrapiMovie[] {
  const { start, end } = getUpcomingCinemaWeekBounds(now);
  const fromRelease = movies.filter((m) => releaseDateInBounds(m, start, end));
  const releaseIds = new Set(fromRelease.map((m) => m.id));
  const fromShowtimes = moviesFromShowtimesOrdered(movies, showtimes, (st) =>
    showtimeOverlapsRange(st, start, end, now),
  );
  const seen = new Set<number>();
  const out: StrapiMovie[] = [];
  for (const m of fromRelease) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      out.push(m);
    }
  }
  for (const m of fromShowtimes) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      out.push(m);
    }
  }
  return out;
}

/** Προσεχώς: κυκλοφορία μετά το τέλος της επόμενης εβδομάδας κινηματογράφου (όχι μέσα σε αυτή). */
export function moviesComingAfterUpcomingCinemaWeek(movies: StrapiMovie[], now = new Date()): StrapiMovie[] {
  const { end } = getUpcomingCinemaWeekBounds(now);
  const afterEnd = new Date(end);
  afterEnd.setDate(afterEnd.getDate() + 1);
  afterEnd.setHours(0, 0, 0, 0);
  const todayStart = startOfLocalDay(now);

  const withParsed: { movie: StrapiMovie; release: Date }[] = [];
  for (const movie of movies) {
    const release = parseReleaseDateLocal(movie.releaseDate ?? "");
    if (!release) continue;
    const r0 = startOfLocalDay(release);
    if (r0.getTime() < afterEnd.getTime()) continue;
    if (r0.getTime() <= todayStart.getTime()) continue;
    withParsed.push({ movie, release: r0 });
  }
  withParsed.sort((a, b) => a.release.getTime() - b.release.getTime());
  return withParsed.map((x) => x.movie);
}

export function formatUpcomingCinemaWeekRange(now = new Date()): string {
  const { start, end } = getUpcomingCinemaWeekBounds(now);
  return formatCinemaWeekRange(start, end);
}

/** Ετικέτα εβδομάδας κινηματογράφου (Πέμπτη – Τετάρτη). */
export function formatCinemaWeekRange(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "short" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

/** Τίτλος ενότητας προγράμματος χώρου (χωρίς ονόματα ημερών). */
export function formatCinemaWeekHeading(start: Date, end: Date, now = new Date()): string {
  const fmt = new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "short" });
  const endLabel = fmt.format(end).replace(/\.$/, "");
  const isCurrent = start.getTime() === startOfCinemaWeek(now).getTime();
  if (isCurrent) return `Τρέχουσα εβδομάδα · μέχρι ${endLabel}`;
  return formatCinemaWeekRange(start, end);
}
