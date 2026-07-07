import { useQuery } from "@tanstack/react-query";
import { fetchMoviePopularity, fetchVenuePopularity } from "@/lib/userProfile";

export function useMoviePopularity(movieId?: number) {
  return useQuery({
    queryKey: ["moviePopularity", movieId],
    queryFn: () => fetchMoviePopularity(movieId!),
    enabled: typeof movieId === "number" && movieId > 0,
    staleTime: 300_000,
    retry: 1,
    throwOnError: false,
  });
}

export function useVenuePopularity(venueId?: number) {
  return useQuery({
    queryKey: ["venuePopularity", venueId],
    queryFn: () => fetchVenuePopularity(venueId!),
    enabled: typeof venueId === "number" && venueId > 0,
    staleTime: 300_000,
    retry: 1,
    throwOnError: false,
  });
}
