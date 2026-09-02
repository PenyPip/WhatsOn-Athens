"use client";

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Eye, MessageSquare, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyNotifications } from "@/lib/userProfile";
import { filterProfileNotifications, markProfileNotificationsSeen } from "@/lib/profileNotifications";

function sourceLabel(source: "review" | "seen"): string {
  return source === "review" ? "Κριτική" : "Το είδα";
}

export default function ProfileNotificationsSection() {
  const { isAuthenticated, user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["profileNotifications"],
    queryFn: fetchMyNotifications,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const notifications = useMemo(() => {
    if (!user?.id || dismissed) {
      return { favoriteTheaterVenues: [], theaterShowUpdates: [], subscriptions: [] };
    }
    return filterProfileNotifications(data, user.id);
  }, [data, user?.id, dismissed]);

  const hasUpdates =
    notifications.favoriteTheaterVenues.length > 0 || notifications.theaterShowUpdates.length > 0;
  const hasSubscriptions = (notifications.subscriptions?.length ?? 0) > 0;

  if (!isAuthenticated) return null;
  if (isLoading) {
    return (
      <section className="card-elevated p-6">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Bell className="h-4 w-4 shrink-0" aria-hidden />
          Φόρτωση ειδοποιήσεων…
        </div>
      </section>
    );
  }
  if (!hasUpdates && !hasSubscriptions) return null;

  const dismiss = () => {
    if (user?.id) markProfileNotificationsSeen(user.id);
    setDismissed(true);
  };

  return (
    <section className="card-elevated overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-amber-50/50 px-6 py-4">
        <div className="flex items-start gap-2 min-w-0">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
          <div>
            <h2 className="font-display text-lg font-semibold text-[#13143E]">Ειδοποιήσεις</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Νέες ημερομηνίες σε αγαπημένα θέατρα και παραστάσεις που παρακολουθείς.
            </p>
          </div>
        </div>
        {hasUpdates ? (
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Σήμανση ως διαβασμένες"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="space-y-6 px-6 py-5">
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
                        onClick={dismiss}
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
                <p className="text-sm font-semibold text-[#13143E]">Παραστάσεις που παρακολουθείς</p>
                <ul className="mt-3 space-y-4">
                  {notifications.theaterShowUpdates.map((show) => (
                    <li key={show.showId} className="flex gap-3">
                      {show.posterUrl ? (
                        <Link to={show.href} onClick={dismiss} className="shrink-0">
                          <img
                            src={show.posterUrl}
                            alt=""
                            width={48}
                            height={72}
                            loading="lazy"
                            className="h-[72px] w-12 rounded object-cover shadow-sm"
                          />
                        </Link>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Link
                            to={show.href}
                            onClick={dismiss}
                            className="font-medium text-[#13143E] underline decoration-[#13143E]/25 underline-offset-2 hover:decoration-[#13143E]/60"
                          >
                            {show.showTitle}
                          </Link>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {show.source === "review" ? (
                              <MessageSquare className="h-3 w-3" aria-hidden />
                            ) : (
                              <Eye className="h-3 w-3" aria-hidden />
                            )}
                            {sourceLabel(show.source)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {show.newCount}{" "}
                          {show.newCount === 1 ? "νέα ημερομηνία" : "νέες ημερομηνίες"}
                        </p>
                        {show.performances.length > 0 ? (
                          <ul className="mt-1.5 space-y-0.5 text-sm text-[#13143E]/85">
                            {show.performances.map((line) => (
                              <li key={line}>· {line}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Δεν υπάρχουν νέες ημερομηνίες αυτή την εβδομάδα. Θα εμφανιστούν εδώ όταν προστεθούν
            προβολές σε παραστάσεις που παρακολουθείς.
          </p>
        )}

        {hasSubscriptions ? (
          <div className="border-t border-border/60 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ενεργή παρακολούθηση
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {notifications.subscriptions.map((show) => (
                <li key={show.showId}>
                  <Link
                    to={show.href}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs text-[#13143E] transition-colors hover:bg-muted"
                  >
                    {show.source === "review" ? (
                      <MessageSquare className="h-3 w-3 text-muted-foreground" aria-hidden />
                    ) : (
                      <Eye className="h-3 w-3 text-muted-foreground" aria-hidden />
                    )}
                    <span className="max-w-[14rem] truncate">{show.showTitle}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
