import { cn } from "@/lib/utils";
import { formatImdbRating } from "@/lib/movieImdb";

type ImdbRatingBadgeProps = {
  rating: number;
  /** poster = πάνω στην αφίσα · inline = δίπλα στον τίτλο · hero = στη σελίδα ταινίας */
  variant?: "poster" | "inline" | "hero";
  className?: string;
};

/** Εμφάνιση βαθμολογίας IMDb — χαρακτηριστικό κίτρινο. */
export default function ImdbRatingBadge({ rating, variant = "poster", className }: ImdbRatingBadgeProps) {
  const label = formatImdbRating(rating);

  if (variant === "hero") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-extrabold tracking-tight text-black shadow-md",
          className,
        )}
        style={{ backgroundColor: "#F5C518" }}
        title={`IMDb ${label}/10`}
      >
        <span>IMDb</span>
        <span className="tabular-nums">{label}</span>
        <span className="text-xs font-bold opacity-80">/10</span>
      </span>
    );
  }

  if (variant === "inline") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-black sm:text-[11px]",
          className,
        )}
        style={{ backgroundColor: "#F5C518" }}
        title={`IMDb ${label}/10`}
      >
        <span>IMDb</span>
        <span className="tabular-nums">{label}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-black shadow-[0_1px_4px_rgba(0,0,0,0.35)] sm:text-[11px]",
        className,
      )}
      style={{ backgroundColor: "#F5C518" }}
      title={`IMDb ${label}/10`}
    >
      <span>IMDb</span>
      <span className="tabular-nums">{label}</span>
    </span>
  );
}
