import { cn } from "@/lib/utils";
import { eventIsFree } from "@/lib/eventLabels";
import type { StrapiEvent } from "@/lib/api";

type EventFreeBadgeProps = {
  event: Pick<StrapiEvent, "ticketPrice" | "tags">;
  className?: string;
  /** dark: πάνω σε σκούρο hero */
  tone?: "light" | "dark";
};

/** Πράσινο, χαρούμενο tag για δωρεάν εκδηλώσεις. */
export default function EventFreeBadge({ event, className, tone = "light" }: EventFreeBadgeProps) {
  if (!eventIsFree(event)) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        tone === "dark"
          ? "bg-emerald-400/95 text-emerald-950 shadow-sm ring-1 ring-emerald-200/80"
          : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300/80",
        className,
      )}
    >
      <span aria-hidden className="text-[13px] leading-none">
        ✦
      </span>
      Δωρεάν/Free
    </span>
  );
}
