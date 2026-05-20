import { Children, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_PREVIEW_COUNT = 3;

type ShowtimesExpandableProps = {
  children: ReactNode;
  /** Πόσες προβολές φαίνονται πριν το «Περισσότερες». */
  previewCount?: number;
  className?: string;
  listClassName?: string;
  /** Κείμενο στο summary (προεπιλογή: Περισσότερες). */
  expandLabel?: string;
};

/**
 * Λίστα προβολών: πρώτες N γραμμές, υπόλοιπες σε accordion (<details>).
 * Τα children πρέπει να είναι στοιχεία λίστας (π.χ. `<li>`).
 */
export default function ShowtimesExpandable({
  children,
  previewCount = DEFAULT_PREVIEW_COUNT,
  className,
  listClassName,
  expandLabel = "Περισσότερες",
}: ShowtimesExpandableProps) {
  const items = Children.toArray(children).filter(Boolean);
  const preview = items.slice(0, previewCount);
  const rest = items.slice(previewCount);

  if (rest.length === 0) {
    return <ul className={listClassName}>{preview}</ul>;
  }

  return (
    <div className={className}>
      <ul className={listClassName}>{preview}</ul>
      <details className="group mt-2 shrink-0 border-t border-border/40 pt-2">
        <summary
          className={cn(
            "flex cursor-pointer list-none items-center justify-between gap-2 rounded-md py-1.5 text-xs font-semibold",
            "text-[#13143E] outline-none ring-offset-background hover:text-[#13143E]/80",
            "focus-visible:ring-2 focus-visible:ring-ring sm:text-sm",
            "[&::-webkit-details-marker]:hidden",
          )}
        >
          <span>{expandLabel}</span>
          <ChevronDown
            aria-hidden
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>
        <ul className={cn(listClassName, "mt-2 border-l-2 border-border/50 pl-2.5")}>{rest}</ul>
      </details>
    </div>
  );
}
