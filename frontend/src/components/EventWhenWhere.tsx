import { MapPin } from "lucide-react";
import type { StrapiEvent } from "@/lib/api";
import { eventLocationLabel, eventLocationMapsUrl, formatEventWhenCompact } from "@/lib/eventLabels";
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
  const when = formatEventWhenCompact(event);
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
            "inline-block max-w-full rounded-md px-2.5 py-1 font-body text-sm font-bold leading-snug tracking-tight",
            dark ? "bg-white/15 text-white" : "bg-[#7C2B76]/10 text-[#7C2B76]",
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
