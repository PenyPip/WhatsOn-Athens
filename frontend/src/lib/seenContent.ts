import type { UserReviewMine } from "@/lib/userProfile";

export function userHasReviewedContent(
  reviews: UserReviewMine[] | undefined,
  input: {
    contentType: "movie" | "theater";
    movieId?: number | null;
    theaterShowId?: number | null;
  },
): boolean {
  if (!reviews?.length) return false;
  if (input.contentType === "movie" && input.movieId != null) {
    return reviews.some((r) => r.contentType === "movie" && r.movieId === input.movieId);
  }
  if (input.contentType === "theater" && input.theaterShowId != null) {
    return reviews.some((r) => r.contentType === "theater" && r.theaterShowId === input.theaterShowId);
  }
  return false;
}
