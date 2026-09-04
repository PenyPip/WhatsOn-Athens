import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toggleFavoriteMovie, toggleFavoriteVenue } from "@/lib/userProfile";
import { useState, type MouseEvent, type ReactElement } from "react";
import { Link } from "react-router-dom";
import ActionHintTooltip from "@/components/ActionHintTooltip";

type FavoriteButtonProps = {
  kind: "movie" | "venue";
  entityId: number;
  className?: string;
  size?: "sm" | "md";
  /** Σκούρο hero - μόνο εικονίδιο, υψηλή αντίθεση (ίδιο με θέατρο). */
  variant?: "default" | "hero";
};

export default function FavoriteButton({
  kind,
  entityId,
  className,
  size = "md",
  variant = "default",
}: FavoriteButtonProps) {
  const { isAuthenticated, profile, setProfile, refreshProfile } = useAuth();
  const [pending, setPending] = useState(false);

  const active =
    kind === "movie"
      ? (profile?.favoriteMovies ?? []).some((m) => m.id === entityId)
      : (profile?.favoriteVenues ?? []).some((v) => v.id === entityId);

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const heroMode = variant === "hero";
  const hintIdle =
    kind === "movie" ? "Like - πρόσθεσε στα αγαπημένα σου" : "Προσθήκη στα αγαπημένα";
  const hintActive =
    kind === "movie" ? "Στα αγαπημένα - πάτα για αφαίρεση" : "Αφαίρεση από αγαπημένα";
  const hint = !isAuthenticated ? "Σύνδεση για αγαπημένα" : active ? hintActive : hintIdle;

  const wrap = (node: ReactElement) => (
    <ActionHintTooltip label={hint} dark={heroMode}>
      {node}
    </ActionHintTooltip>
  );

  if (!isAuthenticated) {
    return wrap(
      <Link
        to="/profile"
        className={cn(
          "inline-flex items-center justify-center rounded-full border transition-colors",
          heroMode
            ? cn(
                size === "sm" ? "h-9 w-9" : "h-10 w-10",
                "border-white/35 bg-black/45 text-white/95 hover:border-white/55 hover:bg-black/60",
              )
            : cn(
                size === "sm" ? "h-8 w-8" : "h-10 w-10",
                "border-border bg-background/80 text-muted-foreground hover:text-foreground",
              ),
          className,
        )}
        aria-label={hint}
      >
        <Heart className={iconSize} />
      </Link>,
    );
  }

  const onToggle = async (event?: MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
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
      /* ignore */
    } finally {
      setPending(false);
    }
  };

  return wrap(
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      className={cn(
        "inline-flex items-center justify-center rounded-full border font-medium transition-colors",
        heroMode
          ? cn(
              size === "sm" ? "h-9 w-9" : "h-10 w-10",
              active
                ? "border-rose-300/70 bg-rose-500/35 text-white shadow-sm backdrop-blur-sm"
                : "border-white/35 bg-black/45 text-white/95 hover:border-white/55 hover:bg-black/60",
            )
          : cn(
              size === "sm" ? "h-8 w-8" : "h-10 w-10",
              active
                ? "border-rose-500/40 bg-rose-500/15 text-rose-500"
                : "border-border bg-background/80 text-muted-foreground hover:text-rose-500",
            ),
        pending && "opacity-60",
        className,
      )}
      aria-label={hint}
      aria-pressed={active}
    >
      <Heart className={cn(iconSize, active && "fill-current")} />
    </button>,
  );
}
