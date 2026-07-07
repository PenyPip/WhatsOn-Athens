"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createMyReview } from "@/lib/userProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

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
    if (body.trim().length < 20) {
      setError("Η κριτική πρέπει να έχει τουλάχιστον 20 χαρακτήρες.");
      return;
    }
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
    <div className="space-y-4 text-left">
      <div>
        <label className="mb-2 block text-sm font-medium">Βαθμολογία</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`h-9 w-9 rounded border text-sm font-semibold transition-colors ${
                rating >= n
                  ? "border-amber-400 bg-amber-500/20 text-amber-100"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
              aria-label={`${n} αστέρια`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="review-body" className="mb-2 block text-sm font-medium">
          Κριτική
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Γράψε τη γνώμη σου..."
        />
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <Button type="button" onClick={submit} disabled={pending}>
        {pending ? "Αποστολή..." : "Δημοσίευση κριτικής"}
      </Button>
    </div>
  );
}
