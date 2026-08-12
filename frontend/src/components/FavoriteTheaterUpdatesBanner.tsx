"use client";

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheaterPerformances, useVenuesForProgram } from "@/hooks/useStrapi";
import {
  findFavoriteTheaterUpdates,
  markFavoriteTheaterUpdatesSeen,
  type FavoriteTheaterUpdate,
} from "@/lib/favoriteTheaterUpdates";

export default function FavoriteTheaterUpdatesBanner({ enabled = true }: { enabled?: boolean }) {
  const { isAuthenticated, user, profile } = useAuth();
  const active = Boolean(enabled && isAuthenticated);
  const { data: performances } = useTheaterPerformances(active);
  const { data: venues } = useVenuesForProgram(active);
  const [dismissed, setDismissed] = useState(false);

  const updates = useMemo((): FavoriteTheaterUpdate[] => {
    if (!active || !user?.id || !profile || dismissed) return [];
    return findFavoriteTheaterUpdates({
      userId: user.id,
      favoriteVenues: profile.favoriteVenues ?? [],
      performances: performances ?? [],
      venues: venues ?? [],
    });
  }, [active, user?.id, profile, performances, venues, dismissed]);

  if (!active || !updates.length) return null;

  const dismiss = () => {
    if (user?.id) markFavoriteTheaterUpdatesSeen(user.id);
    setDismissed(true);
  };

  return (
    <div className="border-b border-amber-500/25 bg-amber-50/90 px-4 py-3">
      <div className="container max-w-7xl flex items-start gap-3">
        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#13143E]">
            Νέες παραστάσεις στα αγαπημένα σου θέατρα
          </p>
          <ul className="mt-1.5 space-y-1">
            {updates.map((u) => (
              <li key={u.venueId} className="text-sm text-[#13143E]/90">
                <Link
                  to={u.href}
                  className="font-medium underline decoration-[#13143E]/30 underline-offset-2 hover:decoration-[#13143E]/60"
                  onClick={dismiss}
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
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md p-1 text-amber-800/70 transition-colors hover:bg-amber-100 hover:text-amber-950"
          aria-label="Απόκρυψη ειδοποίησης"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
