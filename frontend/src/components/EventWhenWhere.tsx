import { MapPin } from "lucide-react";
import type { StrapiEvent } from "@/lib/api";
import { eventLocationLabel, formatEventScheduleLine } from "@/lib/eventLabels";
import { cn } from "@/lib/utils";

type EventWhenWhereProps = {
  event: Pick<
    StrapiEvent,
    "startDate" | "endDate" | "startTime" | "endTime" | "location" | "venue" | "onlineLink"
  >;
  tone?: "light" | "dark";
  className?: string;
};

/** Ημερομηνία και τοποθεσία — η πιο εμφανής πληροφορία πάνω από τον τίτλο. */
export default function EventWhenWhere({ event, tone = "light", className }: EventWhenWhereProps) {
  const when = formatEventScheduleLine(event);
  const where = eventLocationLabel(event);
  const hasWhen = Boolean(when && when !== "-");
  if (!hasWhen && !where) return null;

  const dark = tone === "dark";

  return (
    <div className={className}>
      {hasWhen ? (
        <p
          className={cn(
            "font-display font-bold leading-tight tracking-tight",
            dark ? "text-xl text-white md:text-2xl" : "text-lg text-[#7C2B76] sm:text-xl",
          )}
        >
          {when}
        </p>
      ) : null}
      {where ? (
        <p
          className={cn(
            "flex items-start gap-1.5 font-semibold leading-snug",
            hasWhen && "mt-1",
            dark ? "text-sm text-white md:text-base" : "text-sm text-[#13143E]/90",
          )}
        >
          <MapPin
            className={cn("mt-0.5 h-4 w-4 shrink-0", dark ? "text-white" : "text-[#7C2B76]")}
            aria-hidden
          />
          <span className="line-clamp-2">{where}</span>
        </p>
      ) : null}
    </div>
  );
}
