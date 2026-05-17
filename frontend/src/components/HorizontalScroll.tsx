import { ReactNode, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HorizontalScrollProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  /** Μεγάλη κεφαλίδα και ζωντανή ατμόσφαιρα για ενότητα-σημαία (π.χ. θερινά). */
  spotlight?: boolean;
  /** Μικρότερη έμφαση — ενότητα περιεχομένου χωρίς να τραβάει την προσοχή. */
  muted?: boolean;
  children: ReactNode;
}

const HorizontalScroll = ({ title, subtitle, eyebrow, spotlight, muted, children }: HorizontalScrollProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
    }
  };

  return (
    <section
      className={cn(
        "relative",
        muted ? "py-8 border-y border-border/40 bg-muted/20" : "py-10",
        spotlight && "py-14 md:py-20 bg-gradient-to-b from-amber-500/[0.09] via-transparent to-transparent",
      )}
    >
      {spotlight && (
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-amber-400/15 blur-[100px]"
        />
      )}
      <div className="container relative z-[1]">
        <div className="flex items-end justify-between mb-6">
          <div>
            {(eyebrow || spotlight) && (
              <span
                className={cn(
                  "mb-2 block font-body text-[10px] uppercase tracking-[0.22em]",
                  spotlight ? "text-amber-800/90 dark:text-amber-300/95" : "text-muted-foreground",
                  muted && "opacity-75",
                )}
              >
                {eyebrow || (spotlight ? "Επίκεντρο καλοκαιριού" : eyebrow)}
              </span>
            )}
            <h2
              className={cn(
                "font-display font-bold text-foreground",
                muted ? "text-xl md:text-2xl" : spotlight ? "text-3xl md:text-5xl md:leading-[1.1]" : "text-2xl",
              )}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                className={cn(
                  "mt-1 font-body leading-relaxed",
                  muted ? "text-sm text-muted-foreground max-w-xl" : spotlight ? "text-base md:text-lg text-muted-foreground max-w-2xl mt-2" : "text-base text-muted-foreground mt-1",
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
          <div className={cn("flex shrink-0 items-center gap-1", muted && "opacity-60")}>
            <button type="button" onClick={() => scroll("left")} className="p-2 rounded-full border border-foreground/15 hover:bg-foreground hover:text-background transition-colors" aria-label="Κύλιση αριστερά">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => scroll("right")} className="p-2 rounded-full border border-foreground/15 hover:bg-foreground hover:text-background transition-colors" aria-label="Κύλιση δεξιά">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div ref={scrollRef} className="flex items-start gap-4 overflow-x-auto scrollbar-hide pb-2">
          {children}
        </div>
      </div>
    </section>
  );
};

export default HorizontalScroll;