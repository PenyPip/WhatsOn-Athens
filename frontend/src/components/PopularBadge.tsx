import { cn } from "@/lib/utils";

type PopularBadgeProps = {
  className?: string;
  label?: string;
};

export default function PopularBadge({ className, label = "Δημοφιλές" }: PopularBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-amber-400/35 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200",
        className,
      )}
    >
      {label}
    </span>
  );
}
