"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createMyReview } from "@/lib/userProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type WriteReviewFormProps = {
  contentType: "movie" | "theater" | "restaurant";
  movieId?: number;
  theaterShowId?: number;
  restaurantId?: number;
  onSuccess?: () => void;
};

export default function WriteReviewForm({
  contentType,
  movieId,
  theaterShowId,
  restaurantId,
  onSuccess,
}: WriteReviewFormProps) {
  const { refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(4);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setError(null);
    setPending(true);
    try {
      await createMyReview({
        contentType,
        rating,
        body: body.trim(),
        movieId,
        theaterShowId,
        restaurantId,
      });
      setBody("");
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: ["userReviews"] });
      await queryClient.invalidateQueries({ queryKey: ["myReviews"] });
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Αποτυχία αποστολής κριτικής.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="space-y-5 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Βαθμολογία</p>
        <div className="flex items-center gap-1" role="group" aria-label="Βαθμολογία από 1 έως 5">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = n <= rating;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className="rounded-md p-1.5 transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#13143E]/40"
                aria-label={`${n} από 5 αστέρια`}
                aria-pressed={active}
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-colors",
                    active ? "fill-amber-400 text-amber-500" : "fill-transparent text-muted-foreground/35",
                  )}
                  strokeWidth={active ? 1.5 : 2}
                  aria-hidden
                />
              </button>
            );
          })}
          <span className="ml-2 text-sm font-medium tabular-nums text-muted-foreground">{rating}/5</span>
        </div>
      </div>

      <div>
        <label htmlFor="review-body" className="mb-2 block text-sm font-semibold text-foreground">
          Κριτική <span className="font-normal text-muted-foreground">(προαιρετικά)</span>
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="w-full resize-y rounded-lg border border-border bg-white px-3 py-2.5 text-sm leading-relaxed text-foreground shadow-sm placeholder:text-muted-foreground/60 focus:border-[#13143E]/35 focus:outline-none focus:ring-2 focus:ring-[#13143E]/15"
          placeholder="Προαιρετικά — γράψε τη γνώμη σου με λόγια..."
        />
      </div>

      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <Button
        type="submit"
        disabled={pending}
        size="lg"
        className="h-12 w-full rounded-lg bg-[#13143E] text-base font-semibold text-white shadow-md hover:bg-[#1C1D62] disabled:opacity-60"
      >
        {pending ? "Αποστολή..." : "Υποβολή βαθμολογίας"}
      </Button>
    </form>
  );
}
