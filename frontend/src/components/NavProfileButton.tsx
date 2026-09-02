"use client";

import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileNotifications } from "@/hooks/useProfileNotifications";
import { useDeferUntilLcpDone } from "@/hooks/useDeferUntilLcpDone";
import { useIdleMount } from "@/hooks/useIdleMount";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ProfileNotificationsPanel = lazy(() => import("@/components/ProfileNotificationsPanel"));

type NavProfileButtonProps = {
  variant: "desktop" | "mobile-tab";
  pathname: string;
};

export default function NavProfileButton({ variant, pathname }: NavProfileButtonProps) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const lcpDone = useDeferUntilLcpDone();
  const idleReady = useIdleMount(5000);
  const shouldFetchNotifications = isAuthenticated && (open || (lcpDone && idleReady));
  const { notifications, unreadCount, isLoading, markRead } =
    useProfileNotifications(shouldFetchNotifications);
  const isActive = pathname === "/profile";

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && unreadCount > 0) markRead();
  };

  const badge =
    unreadCount > 0 ? (
      <span
        className={cn(
          "absolute flex items-center justify-center rounded-full bg-rose-500 font-bold text-white shadow-sm",
          variant === "desktop"
            ? "right-0 top-0 min-h-[1.125rem] min-w-[1.125rem] -translate-y-1/3 translate-x-1/3 px-1 text-[10px]"
            : "right-1 top-0 min-h-4 min-w-4 px-0.5 text-[9px]",
        )}
        aria-hidden
      >
        {unreadCount > 9 ? "9+" : unreadCount}
      </span>
    ) : null;

  if (!isAuthenticated) {
    if (variant === "mobile-tab") {
      return (
        <Link
          to="/profile"
          className="mobile-bottom-nav__tab transition-colors"
          style={{ color: isActive ? "#B47EC8" : "rgba(240,237,248,0.5)" }}
        >
          <User strokeWidth={isActive ? 2.25 : 2} aria-hidden />
          <span>Προφίλ</span>
        </Link>
      );
    }
    return (
      <Link
        to="/profile"
        aria-label="Προφίλ"
        className="shrink-0 rounded-full p-2 transition-colors hover:bg-white/10"
      >
        <User className="h-5 w-5 text-white/60" aria-hidden />
      </Link>
    );
  }

  const triggerClass =
    variant === "mobile-tab"
      ? "mobile-bottom-nav__tab relative transition-colors border-0 bg-transparent p-0"
      : "relative shrink-0 rounded-full p-2 transition-colors hover:bg-white/10";

  const triggerStyle =
    variant === "mobile-tab"
      ? { color: isActive || open ? "#B47EC8" : "rgba(240,237,248,0.5)" }
      : undefined;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={triggerClass}
          style={triggerStyle}
          aria-label={unreadCount > 0 ? `Προφίλ, ${unreadCount} νέες ειδοποιήσεις` : "Προφίλ και ειδοποιήσεις"}
        >
          <User
            className={variant === "desktop" ? "h-5 w-5 text-white/60" : undefined}
            strokeWidth={isActive || open ? 2.25 : 2}
            aria-hidden
          />
          {badge}
          {variant === "mobile-tab" ? <span>Προφίλ</span> : null}
        </button>
      </PopoverTrigger>
      {open ? (
        <PopoverContent
          align={variant === "mobile-tab" ? "center" : "end"}
          side={variant === "mobile-tab" ? "top" : "bottom"}
          className="z-[70] w-[min(22rem,calc(100vw-1.5rem))] border-border bg-white p-0 text-[#13143E] shadow-xl"
        >
          <div className="border-b border-[#13143E]/10 bg-amber-50 px-4 py-3">
            <p className="font-display text-base font-semibold text-[#13143E]">Ειδοποιήσεις</p>
            <p className="mt-0.5 text-xs text-[#13143E]/70">
              Like στην παράσταση → μαθαίνεις πρώτος για νέες ημερομηνίες.
            </p>
          </div>
          <div className="bg-white max-h-[min(60vh,24rem)] overflow-y-auto px-4 py-3">
            {isLoading ? (
              <p className="text-sm text-[#13143E]/75">Φόρτωση…</p>
            ) : (
              <Suspense fallback={<p className="text-sm text-[#13143E]/75">Φόρτωση…</p>}>
                <ProfileNotificationsPanel
                  notifications={notifications}
                  onNavigate={() => setOpen(false)}
                  compact
                />
              </Suspense>
            )}
          </div>
          <div className="border-t border-[#13143E]/10 bg-white px-4 py-3">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-[#13143E] underline decoration-[#13143E]/30 underline-offset-2 hover:decoration-[#13143E]/60"
            >
              Όλο το προφίλ →
            </Link>
          </div>
        </PopoverContent>
      ) : null}
    </Popover>
  );
}
