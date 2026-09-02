import type { ProfileNotifications } from "@/lib/userProfile";

const STORAGE_PREFIX = "whatson_profile_notifications_seen:";

function storageKey(userId: number): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function getProfileNotificationsSeenAt(userId: number): number | null {
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

export function markProfileNotificationsSeen(userId: number, at = new Date()): void {
  if (typeof window === "undefined" || !Number.isFinite(userId)) return;
  try {
    window.localStorage.setItem(storageKey(userId), at.toISOString());
  } catch {
    /* ignore quota / private mode */
  }
}

function filterBySeen<T extends { latestAt: string }>(items: T[], seenAt: number | null): T[] {
  if (seenAt == null) return items;
  return items.filter((item) => {
    const ms = Date.parse(item.latestAt);
    return !Number.isFinite(ms) || ms > seenAt;
  });
}

export function filterProfileNotifications(
  data: ProfileNotifications | undefined,
  userId: number,
): ProfileNotifications {
  if (!data) {
    return { favoriteTheaterVenues: [], theaterShowUpdates: [], subscriptions: [] };
  }
  const seenAt = getProfileNotificationsSeenAt(userId);
  return {
    favoriteTheaterVenues: filterBySeen(data.favoriteTheaterVenues, seenAt),
    theaterShowUpdates: filterBySeen(data.theaterShowUpdates, seenAt),
    subscriptions: data.subscriptions,
  };
}

export function countUnreadProfileNotifications(notifications: ProfileNotifications): number {
  return notifications.favoriteTheaterVenues.length + notifications.theaterShowUpdates.length;
}
