import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import type { ProfileNotifications } from "@/lib/userProfile";

type ProfileNotificationsPanelProps = {
  notifications: ProfileNotifications;
  onNavigate?: () => void;
  compact?: boolean;
};

export default function ProfileNotificationsPanel({
  notifications,
  onNavigate,
  compact = false,
}: ProfileNotificationsPanelProps) {
  const hasUpdates =
    notifications.favoriteTheaterVenues.length > 0 || notifications.theaterShowUpdates.length > 0;
  const hasSubscriptions = notifications.subscriptions.length > 0;

  if (!hasUpdates && !hasSubscriptions) {
    return (
      <p className="text-sm text-muted-foreground">
        Δεν έχεις νέες ειδοποιήσεις. Πρόσθεσε αγαπημένες παραστάσεις ή θέατρα για να ενημερώνεσαι.
      </p>
    );
  }

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {hasUpdates ? (
        <>
          {notifications.favoriteTheaterVenues.length > 0 ? (
            <div>
              <p className="text-sm font-semibold text-[#13143E]">Αγαπημένα θέατρα</p>
              <ul className="mt-2 space-y-2">
                {notifications.favoriteTheaterVenues.map((u) => (
                  <li key={u.venueId} className="text-sm">
                    <Link
                      to={u.href}
                      onClick={onNavigate}
                      className="font-medium text-[#13143E] underline decoration-[#13143E]/25 underline-offset-2 hover:decoration-[#13143E]/60"
                    >
                      {u.venueName}
                    </Link>
                    <span className="text-muted-foreground">
                      {" "}
                      · {u.newCount} {u.newCount === 1 ? "νέα ημερομηνία" : "νέες ημερομηνίες"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {notifications.theaterShowUpdates.length > 0 ? (
            <div>
              <p className="text-sm font-semibold text-[#13143E]">Αγαπημένες παραστάσεις</p>
              <ul className="mt-2 space-y-3">
                {notifications.theaterShowUpdates.map((show) => (
                  <li key={show.showId} className="text-sm">
                    <Link
                      to={show.href}
                      onClick={onNavigate}
                      className="font-medium text-[#13143E] underline decoration-[#13143E]/25 underline-offset-2 hover:decoration-[#13143E]/60"
                    >
                      {show.showTitle}
                    </Link>
                    <span className="text-muted-foreground">
                      {" "}
                      · {show.newCount} {show.newCount === 1 ? "νέα ημερομηνία" : "νέες ημερομηνίες"}
                    </span>
                    {show.performances.length > 0 ? (
                      <ul className="mt-1 space-y-0.5 text-[#13143E]/85">
                        {show.performances.slice(0, compact ? 2 : 5).map((line) => (
                          <li key={line}>· {line}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Δεν υπάρχουν νέες ημερομηνίες αυτή την εβδομάδα.
        </p>
      )}

      {hasSubscriptions ? (
        <div className="border-t border-border/60 pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Αγαπημένες χωρίς νέες ημερομηνίες
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {notifications.subscriptions.map((show) => (
              <li key={show.showId}>
                <Link
                  to={show.href}
                  onClick={onNavigate}
                  className="inline-flex max-w-[14rem] truncate rounded-full border border-border bg-background px-3 py-1 text-xs text-[#13143E] transition-colors hover:bg-muted"
                >
                  {show.showTitle}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function ProfileNotificationsEmptyIcon() {
  return <Bell className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />;
}
