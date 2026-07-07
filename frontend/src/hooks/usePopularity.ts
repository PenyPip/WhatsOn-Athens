import { useQuery } from "@tanstack/react-query";
import { fetchMoviePopularity } from "@/lib/userProfile";

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
