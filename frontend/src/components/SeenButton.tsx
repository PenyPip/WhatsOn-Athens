import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toggleSeenMovie, toggleSeenTheaterShow } from "@/lib/userProfile";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

type SeenButtonProps = {
  kind: "movie" | "theater";
  entityId: number;
  className?: string;
  size?: "sm" | "md";
  /** Εμφάνιση κειμένου δίπλα στο εικονίδιο (σελίδα λεπτομέρειας). */
  showLabel?: boolean;
  /** Σκούρο hero — μόνο εικονίδιο, υψηλή αντίθεση. */
  variant?: "default" | "hero";
};

export default function SeenButton({
  kind,
  entityId,
  className,
  size = "md",
  showLabel = false,
  variant = "default",
}: SeenButtonProps) {
  const { isAuthenticated, profile, setProfile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const active =
    kind === "movie"
      ? (profile?.seenMovies ?? []).some((m) => m.id === entityId)
      : (profile?.seenTheaterShows ?? []).some((s) => s.id === entityId);

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const label = active ? "Το είδα" : "Σημείωσε ότι το είδες";
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
          <Eye className={iconSize} aria-hidden />
          Σύνδεση για «Το είδα»
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
        title="Σύνδεση για «Το είδα»"
        aria-label="Σύνδεση για «Το είδα»"
      >
        <Eye className={iconSize} />
      </Link>
    );
  }

  const onToggle = async () => {
    if (pending) return;
    setPending(true);
    try {
      const result =
        kind === "movie"
          ? await toggleSeenMovie(entityId)
          : await toggleSeenTheaterShow(entityId);
      setProfile(result.profile);
      await refreshProfile();
      if (kind === "theater") {
        await queryClient.invalidateQueries({ queryKey: ["profileNotifications"] });
      }
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
            ? "border-sky-300/70 bg-sky-500/35 text-white shadow-sm backdrop-blur-sm"
            : "border-white/35 bg-black/45 text-white/95 hover:border-white/55 hover:bg-black/60",
        )
      : cn(
          showText ? "gap-2 px-3 py-2 text-sm" : size === "sm" ? "h-8 w-8" : "h-10 w-10",
          active
            ? "border-sky-500/40 bg-sky-500/15 text-sky-600"
            : "border-border bg-background text-muted-foreground hover:border-sky-400/40 hover:text-sky-600",
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
        {active ? <Eye className={iconSize} aria-hidden /> : <EyeOff className={iconSize} aria-hidden />}
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
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      {active ? (
        <Eye className={cn(iconSize, heroMode ? undefined : "fill-current/20")} />
      ) : (
        <Eye className={iconSize} />
      )}
    </button>
  );
}
