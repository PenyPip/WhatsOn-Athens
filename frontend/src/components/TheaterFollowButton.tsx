import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toggleFollowTheaterShow } from "@/lib/userProfile";
import { useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";

type TheaterFollowButtonProps = {
  theaterShowId: number;
  className?: string;
  size?: "sm" | "md";
  /** Εμφάνιση κειμένου δίπλα στην καρδιά (σελίδα λεπτομέρειας). */
  showLabel?: boolean;
};

export default function TheaterFollowButton({
  theaterShowId,
  className,
  size = "md",
  showLabel = false,
}: TheaterFollowButtonProps) {
  const { isAuthenticated, profile, setProfile, refreshProfile } = useAuth();
  const [pending, setPending] = useState(false);
  const [notifyHint, setNotifyHint] = useState(false);

  const active = (profile?.followedTheaterShows ?? []).some((s) => s.id === theaterShowId);
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const label = active ? "Παρακολουθείς" : "Παρακολούθηση";

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
          Σύνδεση για παρακολούθηση
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
        title="Σύνδεση για παρακολούθηση"
        aria-label="Σύνδεση για παρακολούθηση"
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
      if (result.active) setNotifyHint(true);
      else setNotifyHint(false);
    } catch {
      /* ignore */
    } finally {
      setPending(false);
    }
  };

  if (showLabel) {
    return (
      <div className={cn("flex flex-col items-start gap-1", className)}>
        <button
          type="button"
          onClick={onToggle}
          disabled={pending}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors",
            active
              ? "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-200"
              : "border-border bg-background/80 text-muted-foreground hover:border-rose-400/40 hover:text-rose-600",
            pending && "opacity-60",
          )}
          aria-pressed={active}
          aria-label={label}
        >
          <Heart className={cn(iconSize, active && "fill-current")} aria-hidden />
          {label}
        </button>
        {notifyHint && active ? (
          <p className="max-w-xs text-xs text-muted-foreground">
            Θα ενημερώνεσαι για νέες ημερομηνίες αυτής της παράστασης.
          </p>
        ) : null}
      </div>
    );
  }

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
      title={active ? "Διακοπή παρακολούθησης" : "Παρακολούθηση για νέες ημερομηνίες"}
      aria-label={active ? "Διακοπή παρακολούθησης" : "Παρακολούθηση για νέες ημερομηνίες"}
      aria-pressed={active}
    >
      <Heart className={cn(iconSize, active && "fill-current")} />
    </button>
  );
}
