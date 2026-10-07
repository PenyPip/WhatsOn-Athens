import { MapPin } from "lucide-react";
import type { StrapiEvent } from "@/lib/api";
import { eventLocationLabel, eventLocationMapsUrl, formatEventScheduleLine } from "@/lib/eventLabels";
import { cn } from "@/lib/utils";

type EventWhenWhereProps = {
  event: Pick<
    StrapiEvent,
    | "startDate"
    | "endDate"
    | "startTime"
    | "endTime"
    | "location"
    | "locationMapsUrl"
    | "venue"
    | "onlineLink"
  >;
  tone?: "light" | "dark";
  className?: string;
};

/** Ημερομηνία και τοποθεσία — η πιο εμφανής πληροφορία πάνω από τον τίτλο. */
export default function EventWhenWhere({ event, tone = "light", className }: EventWhenWhereProps) {
  const when = formatEventScheduleLine(event);
  const where = eventLocationLabel(event);
  const mapsUrl = eventLocationMapsUrl(event);
  const hasWhen = Boolean(when && when !== "-");
  if (!hasWhen && !where) return null;

  const dark = tone === "dark";
  const whereClass = cn(
    "flex items-start gap-1.5 font-semibold leading-snug",
    hasWhen && "mt-1",
    dark ? "text-sm text-white md:text-base" : "text-sm text-[#13143E]/90",
    mapsUrl &&
      (dark
        ? "underline decoration-white/50 underline-offset-2 hover:decoration-white"
        : "underline decoration-[#7C2B76]/45 underline-offset-2 hover:decoration-[#7C2B76]"),
  );

  const pin = (
    <>
      <MapPin
        className={cn("mt-0.5 h-4 w-4 shrink-0", dark ? "text-white" : "text-[#7C2B76]")}
        aria-hidden
      />
      <span className="line-clamp-2">{where}</span>
    </>
  );

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
        mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Άνοιγμα στο Google Maps"
            className={cn(whereClass, "pointer-events-auto relative z-10")}
            onClick={(e) => e.stopPropagation()}
          >
            {pin}
          </a>
        ) : (
          <p className={whereClass}>{pin}</p>
        )
      ) : null}
    </div>
  );
}
