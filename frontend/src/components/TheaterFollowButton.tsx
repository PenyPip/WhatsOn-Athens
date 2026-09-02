import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toggleFollowTheaterShow } from "@/lib/userProfile";
import { useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

type TheaterFollowButtonProps = {
  theaterShowId: number;
  className?: string;
  size?: "sm" | "md";
  /** Εμφάνιση κειμένου δίπλα στην καρδιά (σελίδα λεπτομέρειας). */
  showLabel?: boolean;
  /** Σκούρο hero — μόνο εικονίδιο, υψηλή αντίθεση. */
  variant?: "default" | "hero";
};

export default function TheaterFollowButton({
  theaterShowId,
  className,
  size = "md",
  showLabel = false,
  variant = "default",
}: TheaterFollowButtonProps) {
  const { isAuthenticated, profile, setProfile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const active = (profile?.followedTheaterShows ?? []).some((s) => s.id === theaterShowId);
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const label = active ? "Αγαπημένη" : "Προσθήκη στα αγαπημένα";
  const heroMode = variant === "hero";
  const showText = showLabel && !heroMode;

  if (!isAuthenticated) {
    if (showLabel) {
      return (
        <Link
          to="/profile"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
            className,
          )}
        >
          <Heart className={iconSize} aria-hidden />
          Σύνδεση για αγαπημένα
        </Link>
      );
    }
    return (
      <Link
        to="/profile"
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground transition-colors hover:text-foreground",
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

  const onToggle = async (event?: MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (pending) return;
    setPending(true);
    try {
      const result = await toggleFollowTheaterShow(theaterShowId);
      setProfile(result.profile);
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: ["profileNotifications"] });
    } catch {
      /* ignore */
    } finally {
      setPending(false);
    }
  };

  const buttonClass = cn(
    "inline-flex items-center justify-center rounded-full border font-medium transition-colors",
    heroMode
      ? cn(
          size === "sm" ? "h-9 w-9" : "h-10 w-10",
          active
            ? "border-rose-300/70 bg-rose-500/35 text-white shadow-sm backdrop-blur-sm"
            : "border-white/35 bg-black/45 text-white/95 hover:border-white/55 hover:bg-black/60",
        )
      : cn(
          showText ? "gap-2 px-3 py-2 text-sm" : size === "sm" ? "h-8 w-8" : "h-10 w-10",
          active
            ? "border-rose-500/40 bg-rose-500/15 text-rose-600"
            : "border-border bg-background text-muted-foreground hover:border-rose-400/40 hover:text-rose-600",
        ),
    pending && "opacity-60",
    !showText && className,
  );

  if (showText) {
    return (
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className={cn(buttonClass, className)}
        aria-pressed={active}
        aria-label={label}
      >
        <Heart className={cn(iconSize, active && "fill-current")} aria-hidden />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      className={buttonClass}
      title={active ? "Αφαίρεση από αγαπημένα" : "Αγαπημένη — ειδοποιήσεις για νέες ημερομηνίες"}
      aria-label={active ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}
      aria-pressed={active}
    >
      <Heart className={cn(iconSize, active && "fill-current")} />
    </button>
  );
}
