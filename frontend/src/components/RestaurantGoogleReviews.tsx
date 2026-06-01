import { ExternalLink, Star } from "lucide-react";
import type { RestaurantGoogleReviews } from "@/lib/api";

type Props = {
  data: RestaurantGoogleReviews | undefined;
  isLoading: boolean;
  fallbackMapsHref?: string | null;
};

function Stars({ rating }: { rating: number }) {
  const full = Math.round(Math.min(5, Math.max(0, rating)));
  return (
    <span className="inline-flex items-center gap-0.5 text-[#13143E]" aria-label={`${rating} από 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < full ? "fill-current" : "fill-none opacity-25"}`}
          aria-hidden
        />
      ))}
    </span>
  );
}

const RestaurantGoogleReviewsSection = ({ data, isLoading, fallbackMapsHref }: Props) => {
  const mapsLink = data?.googleMapsUri || fallbackMapsHref;
  const hasReviews = (data?.reviews?.length ?? 0) > 0;
  const hasSummary = data?.rating != null;

  if (!isLoading && !hasReviews && !hasSummary) return null;

  return (
    <section className="animate-fade-in-up">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Κριτικές Google</h2>
          {hasSummary ? (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Stars rating={data!.rating!} />
              <span className="font-semibold text-foreground">{data!.rating!.toFixed(1)}</span>
              {data!.userRatingCount != null ? (
                <span>
                  ({data!.userRatingCount.toLocaleString("el-GR")}{" "}
                  {data!.userRatingCount === 1 ? "κριτική" : "κριτικές"})
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        {mapsLink ? (
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Όλες στο Google Maps
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </a>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Φόρτωση κριτικών…</p>
      ) : (
        <ul className="space-y-3">
          {(data?.reviews ?? []).map((review, index) => (
            <li key={`${review.authorName}-${index}`} className="card-elevated p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">{review.authorName}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {review.rating > 0 ? <Stars rating={review.rating} /> : null}
                  {review.relativeTime ? <span>{review.relativeTime}</span> : null}
                </div>
              </div>
              {review.text ? <p className="text-sm leading-relaxed text-muted-foreground">{review.text}</p> : null}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">
        Κριτικές από χρήστες στο Google ·{" "}
        <a
          href="https://policies.google.com/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          Όροι Google
        </a>
      </p>
    </section>
  );
};

export default RestaurantGoogleReviewsSection;
