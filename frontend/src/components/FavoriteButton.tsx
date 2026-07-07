import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toggleFavoriteMovie, toggleFavoriteVenue } from "@/lib/userProfile";
import { useState } from "react";
import { Link } from "react-router-dom";

type FavoriteButtonProps = {
  kind: "movie" | "venue";
  entityId: number;
  className?: string;
  size?: "sm" | "md";
};

export default function FavoriteButton({ kind, entityId, className, size = "md" }: FavoriteButtonProps) {
  const { isAuthenticated, profile, setProfile, refreshProfile } = useAuth();
  const [pending, setPending] = useState(false);

  const active =
    kind === "movie"
      ? (profile?.favoriteMovies ?? []).some((m) => m.id === entityId)
      : (profile?.favoriteVenues ?? []).some((v) => v.id === entityId);

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  if (!isAuthenticated) {
    return (
      <Link
        to="/profile"
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground hover:text-foreground transition-colors",
          size === "sm" ? "h-8 w-8" : "h-10 w-10",
          className,
        )}
        title="Σύνδεση για αγαπημένα"
        aria-label="Σύνδεση για αγαπημένα"
      >
        <Heart className={iconSize} />
      </Link>
    );
  }

  const onToggle = async () => {
    if (pending) return;
    setPending(true);
    try {
      const result =
        kind === "movie"
          ? await toggleFavoriteMovie(entityId)
          : await toggleFavoriteVenue(entityId);
      setProfile(result.profile);
      await refreshProfile();
    } catch {
      /* ignore — μπορεί να εμφανιστεί toast αργότερα */
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      className={cn(
        "inline-flex items-center justify-center rounded-full border transition-colors",
        active
          ? "border-rose-500/40 bg-rose-500/15 text-rose-500"
          : "border-border bg-background/80 text-muted-foreground hover:text-rose-500",
        size === "sm" ? "h-8 w-8" : "h-10 w-10",
        pending && "opacity-60",
        className,
      )}
      title={active ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}
      aria-label={active ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}
      aria-pressed={active}
    >
      <Heart className={cn(iconSize, active && "fill-current")} />
    </button>
  );
}
