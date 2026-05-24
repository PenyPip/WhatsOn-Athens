import { cn } from "@/lib/utils";
import { formatEuroPrice } from "@/lib/venuePricing";

export function ShowtimePriceLabels({
  regular,
  student,
  className,
  align = "right",
}: {
  regular?: number;
  student?: number;
  className?: string;
  align?: "left" | "right";
}) {
  if (regular == null && student == null) return null;

  return (
    <div
      className={cn(
        "shrink-0 tabular-nums",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {regular != null ? (
        <p className="text-base font-semibold text-foreground">{formatEuroPrice(regular)}</p>
      ) : null}
      {student != null ? (
        <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
          Μειωμένο / φοιτητικό · {formatEuroPrice(student)}
        </p>
      ) : null}
    </div>
  );
}
