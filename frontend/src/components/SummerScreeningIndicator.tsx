import { Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/** Θερινή / υπαίθρια προβολή (CMS `summer_screening`). */
export default function SummerScreeningIndicator({
  className,
  iconClassName,
  title = "Θερινή προβολή",
}: {
  className?: string;
  iconClassName?: string;
  title?: string;
}) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center", className)}
      title={title}
      aria-label={title}
    >
      <Sun
        className={cn("h-3.5 w-3.5 fill-amber-300/90 stroke-amber-700", iconClassName)}
        aria-hidden
      />
    </span>
  );
}
