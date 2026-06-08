import { cn } from "@/lib/utils";
import type { ScheduleSlot } from "@/lib/showtimeSchedule";
import { formatShowtimeWeekRangeLabel, showtimeIsWeekBlock } from "@/lib/showtimeSchedule";

type ScheduleCompactRowProps = {
  slot: ScheduleSlot;
  hallName?: string;
  priceLabel?: string | null;
  emphasized?: boolean;
};

/** Γραμμή ημερομηνίας/ώρας — κοινή για προβολές ταινίας και θεατρικές παραστάσεις. */
export default function ScheduleCompactRow({
  slot,
  hallName,
  priceLabel,
  emphasized = false,
}: ScheduleCompactRowProps) {
  if (showtimeIsWeekBlock(slot)) {
    const weekLabel = formatShowtimeWeekRangeLabel(slot);
    return (
      <li
        className={cn(
          "flex flex-col gap-0.5 border-b border-border/80 last:border-0",
          emphasized ? "py-3 text-sm sm:py-3.5" : "py-3.5 text-sm",
        )}
      >
        <p className="font-medium text-foreground">
          {weekLabel ?? "Εβδομάδα εμφανίσεων"}
          <span className="text-muted-foreground"> · ώρες σύντομα</span>
        </p>
        {hallName ? <p className="text-muted-foreground">Αίθουσα · {hallName}</p> : null}
      </li>
    );
  }

  const d = new Date(slot.datetime);

  return (
    <li
      className={cn(
        "flex flex-col gap-0.5 border-b border-border/80 last:border-0",
        emphasized ? "py-3 text-sm sm:py-3.5" : "py-3.5 text-sm",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span
            className={cn(
              "capitalize text-foreground",
              emphasized ? "text-sm text-muted-foreground" : "font-medium",
            )}
          >
            {d.toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 font-semibold tabular-nums text-[#13143E]",
              emphasized ? "text-base" : "text-lg",
            )}
          >
            {d.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit", hour12: false })}
          </span>
        </div>
        {priceLabel ? (
          <span className="shrink-0 text-sm font-semibold tabular-nums text-[#13143E]">{priceLabel}</span>
        ) : null}
      </div>
      {hallName ? <p className="text-muted-foreground">Αίθουσα · {hallName}</p> : null}
    </li>
  );
}
