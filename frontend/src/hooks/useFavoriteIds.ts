import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { EMPTY_FAVORITE_IDS, favoriteIdSetsFromProfile, type FavoriteIdSets } from "@/lib/favoriteSort";

export function useFavoriteIds(): FavoriteIdSets {
  const { isAuthenticated, profile } = useAuth();
  return useMemo(
    () => (isAuthenticated ? favoriteIdSetsFromProfile(profile) : EMPTY_FAVORITE_IDS),
    [isAuthenticated, profile],
  );
}
