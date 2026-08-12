import type { StrapiTheaterPerformance, StrapiVenue } from "@/lib/api";
import {
  isTheaterPerformanceNewlyAdded,
  NEW_THEATER_PERFORMANCE_DAYS,
  resolveVenueForPerformance,
} from "@/lib/theaterPerformances";
import { showtimeIsUpcoming } from "@/lib/showtimeSchedule";
import type { ProfileVenue } from "@/lib/userProfile";
import { isTheaterVenue } from "@/lib/venueType";
import { theaterVenueProgramPath } from "@/lib/theaterVenuePath";

const STORAGE_PREFIX = "whatson_fav_theater_updates_seen:";

export type FavoriteTheaterUpdate = {
  venueId: number;
  venueName: string;
  venueSlug: string;
  href: string;
  newCount: number;
};

function storageKey(userId: number): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function getFavoriteTheaterUpdatesSeenAt(userId: number): number | null {
  if (typeof window === "undefined" || !Number.isFinite(userId)) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const ms = Date.parse(raw);
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

export function markFavoriteTheaterUpdatesSeen(userId: number, at = new Date()): void {
  if (typeof window === "undefined" || !Number.isFinite(userId)) return;
  try {
    window.localStorage.setItem(storageKey(userId), at.toISOString());
  } catch {
    /* ignore quota / private mode */
  }
}

function isFavoriteTheaterVenue(venue: Pick<ProfileVenue, "venueType">): boolean {
  return String(venue.venueType || "").trim().toLowerCase() === "theater";
}

/**
 * Νέες παραστάσεις σε αγαπημένα θέατρα μετά το τελευταίο «το είδα»
 * (και εντός NEW_THEATER_PERFORMANCE_DAYS).
 */
export function findFavoriteTheaterUpdates(options: {
  userId: number;
  favoriteVenues: ProfileVenue[];
  performances: StrapiTheaterPerformance[];
  venues?: StrapiVenue[];
  now?: Date;
}): FavoriteTheaterUpdate[] {
  const {
    userId,
    favoriteVenues,
    performances,
    venues = [],
    now = new Date(),
  } = options;
  const seenAt = getFavoriteTheaterUpdatesSeenAt(userId);
  const theaterFavs = favoriteVenues.filter(isFavoriteTheaterVenue);
  if (!theaterFavs.length || !performances.length) return [];

  const favById = new Map(theaterFavs.map((v) => [Number(v.id), v]));
  const counts = new Map<number, number>();

  for (const p of performances) {
    if (!showtimeIsUpcoming(p)) continue;
    if (!isTheaterPerformanceNewlyAdded(p, now, NEW_THEATER_PERFORMANCE_DAYS)) continue;
    const createdMs = p.createdAt ? Date.parse(p.createdAt) : NaN;
    if (seenAt != null && Number.isFinite(createdMs) && createdMs <= seenAt) continue;

    const linked = resolveVenueForPerformance(p, venues);
    const venueId =
      linked?.id != null
        ? Number(linked.id)
        : p.venueId != null
          ? Number(p.venueId)
          : NaN;
    if (!Number.isFinite(venueId) || !favById.has(venueId)) continue;
    if (linked && !isTheaterVenue(linked)) continue;
    counts.set(venueId, (counts.get(venueId) || 0) + 1);
  }

  const out: FavoriteTheaterUpdate[] = [];
  for (const [venueId, newCount] of counts) {
    const fav = favById.get(venueId);
    if (!fav || newCount < 1) continue;
    const slug = fav.slug?.trim();
    if (!slug) continue;
    out.push({
      venueId,
      venueName: fav.name,
      venueSlug: slug,
      href: theaterVenueProgramPath(slug),
      newCount,
    });
  }

  return out.sort((a, b) => a.venueName.localeCompare(b.venueName, "el"));
}
