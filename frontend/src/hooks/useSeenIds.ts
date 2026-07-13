import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

export type SeenIdSets = {
  movieIds: Set<number>;
  theaterShowIds: Set<number>;
};

export const EMPTY_SEEN_IDS: SeenIdSets = {
  movieIds: new Set(),
  theaterShowIds: new Set(),
};

export function seenIdSetsFromProfile(
  profile: { seenMovies?: { id: number }[]; seenTheaterShows?: { id: number }[] } | null | undefined,
): SeenIdSets {
  return {
    movieIds: new Set((profile?.seenMovies ?? []).map((m) => m.id)),
    theaterShowIds: new Set((profile?.seenTheaterShows ?? []).map((s) => s.id)),
  };
}

export function useSeenIds(): SeenIdSets {
  const { isAuthenticated, profile } = useAuth();
  return useMemo(
    () => (isAuthenticated ? seenIdSetsFromProfile(profile) : EMPTY_SEEN_IDS),
    [isAuthenticated, profile],
  );
}
