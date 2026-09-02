"use client";

import { Bell, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileNotifications } from "@/hooks/useProfileNotifications";
import ProfileNotificationsPanel from "@/components/ProfileNotificationsPanel";

export default function ProfileNotificationsSection() {
  const { isAuthenticated } = useAuth();
  const { notifications, isLoading, markRead, unreadCount } = useProfileNotifications();

  if (!isAuthenticated) return null;
  if (isLoading) {
    return (
      <section className="card-elevated p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell className="h-4 w-4 shrink-0" aria-hidden />
          Φόρτωση ειδοποιήσεων…
        </div>
      </section>
    );
  }

  const hasContent =
    unreadCount > 0 ||
    notifications.subscriptions.length > 0;

  if (!hasContent) return null;

  return (
    <section className="card-elevated overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-amber-50/50 px-6 py-4">
        <div className="flex min-w-0 items-start gap-2">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
          <div>
            <h2 className="font-display text-lg font-semibold text-[#13143E]">Ειδοποιήσεις</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Νέες ημερομηνίες σε αγαπημένα θέατρα και παραστάσεις.
            </p>
          </div>
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={markRead}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Σήμανση ως διαβασμένες"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="px-6 py-5">
        <ProfileNotificationsPanel notifications={notifications} />
      </div>
    </section>
  );
}
