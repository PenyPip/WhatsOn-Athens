import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyNotifications } from "@/lib/userProfile";
import {
  countUnreadProfileNotifications,
  filterProfileNotifications,
  markProfileNotificationsSeen,
} from "@/lib/profileNotifications";

export function useProfileNotifications(enabled = true) {
  const { isAuthenticated, user } = useAuth();
  const [readTick, setReadTick] = useState(0);
  const active = Boolean(enabled && isAuthenticated);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["profileNotifications"],
    queryFn: fetchMyNotifications,
    enabled: active,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  const notifications = useMemo(() => {
    void readTick;
    if (!user?.id) {
      return { favoriteTheaterVenues: [], theaterShowUpdates: [], subscriptions: [] };
    }
    return filterProfileNotifications(data, user.id);
  }, [data, user?.id, readTick]);

  const unreadCount = useMemo(() => countUnreadProfileNotifications(notifications), [notifications]);

  const markRead = useCallback(() => {
    if (!user?.id) return;
    markProfileNotificationsSeen(user.id);
    setReadTick((t) => t + 1);
  }, [user?.id]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    refetch,
  };
}
