import { useCallback, useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { isMovieInWatchlist, toggleMovieWatchlist } from "@/lib/movieWatchlist";
import { cn } from "@/lib/utils";

export default function MovieWatchlistButton({
  slug,
  title,
  className,
  compact,
}: {
  slug: string;
  title: string;
  className?: string;
  compact?: boolean;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isMovieInWatchlist(slug));
  }, [slug]);

  const toggle = useCallback(() => {
    const next = toggleMovieWatchlist(slug);
    setSaved(next);
  }, [slug]);

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/80 transition-colors",
        saved
          ? "border-amber-500/40 bg-amber-50/80 text-amber-950 hover:bg-amber-50"
          : "text-foreground hover:border-[#13143E]/30 hover:bg-muted/40",
        compact ? "px-2.5 py-1.5 text-xs font-medium" : "px-3 py-2 text-sm font-medium",
        className,
      )}
      aria-pressed={saved}
      aria-label={saved ? `Αφαίρεση «${title}» από αποθηκευμένες` : `Αποθήκευση «${title}»`}
    >
      <Bookmark className={cn("h-4 w-4", saved && "fill-current")} aria-hidden />
      {saved ? "Αποθηκευμένη" : "Αποθήκευση"}
    </button>
  );
}
