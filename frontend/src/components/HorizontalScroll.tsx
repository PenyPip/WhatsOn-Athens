import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
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

const SCROLL_BTN_SLOT_CLASS = "relative z-20 flex w-[4.75rem] shrink-0 items-center justify-end gap-1";

const HorizontalScroll = ({ title, subtitle, eyebrow, spotlight, muted, children }: HorizontalScrollProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const rafRef = useRef(0);

  const syncScrollEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setOverflowing(false);
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxLeft = Math.max(0, scrollWidth - clientWidth);
    const eps = 2;
    const ov = scrollWidth > clientWidth + eps;
    setOverflowing(ov);
    setCanScrollLeft(ov && scrollLeft > eps);
    setCanScrollRight(ov && scrollLeft < maxLeft - eps);
  }, []);

  const scheduleSync = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(syncScrollEdges);
  }, [syncScrollEdges]);

  useEffect(() => {
    const el = scrollRef.current;
    scheduleSync();
    if (!el) return undefined;

    const ro = new ResizeObserver(() => scheduleSync());
    ro.observe(el);
    el.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      el.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
    };
  }, [scheduleSync]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = Math.max(260, Math.round(el.clientWidth * 0.72));
    const target = el.scrollLeft + (dir === "left" ? -delta : delta);
    el.scrollTo({ left: target, behavior: "smooth" });
  };

  const headerAndRail = (
    <>
      <div className="mb-6 flex min-w-0 max-w-full items-end justify-between gap-4">
        <div className="min-w-0">
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
        {/* Σταθερό πλάτος — τα κουμπιά δεν εμφανίζονται ξαφνικά (CLS). */}
        <div
          className={cn(
            SCROLL_BTN_SLOT_CLASS,
            !overflowing && "invisible pointer-events-none",
            muted && overflowing && "opacity-60",
          )}
          aria-hidden={!overflowing}
        >
          <button
            type="button"
            disabled={!canScrollLeft}
            onClick={() => scroll("left")}
            className={cn(
              "rounded-full border border-foreground/15 p-2 transition-colors",
              canScrollLeft ? "hover:bg-foreground hover:text-background" : "cursor-default opacity-35",
            )}
            aria-label="Κύλιγμα αριστερά"
            tabIndex={overflowing ? 0 : -1}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!canScrollRight}
            onClick={() => scroll("right")}
            className={cn(
              "rounded-full border border-foreground/15 p-2 transition-colors",
              canScrollRight ? "hover:bg-foreground hover:text-background" : "cursor-default opacity-35",
            )}
            aria-label="Κύλιγμα δεξιά"
            tabIndex={overflowing ? 0 : -1}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="min-w-0 max-w-full">
        <div
          ref={scrollRef}
          className={cn(
            "flex max-w-full min-w-0 flex-nowrap items-stretch gap-4 overflow-x-scroll overscroll-x-contain pb-2 scrollbar-hide",
            "touch-pan-x scroll-smooth [-webkit-overflow-scrolling:touch]",
          )}
        >
          {children}
        </div>
      </div>
    </>
  );

  return (
    <section
      className={cn(
        "relative",
        muted && "border-y border-border/40 bg-muted/20 py-8",
        spotlight && !muted && "py-6 md:py-10",
        !muted && !spotlight && "py-10",
      )}
    >
      {spotlight && !muted ? (
        <div className="container relative z-[1] max-w-7xl min-w-0">
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/15 bg-gradient-to-b from-amber-500/[0.09] via-transparent to-transparent px-4 py-10 md:px-8 md:py-14">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-12 top-0 h-64 w-64 rounded-full bg-amber-400/15 blur-[100px]"
            />
            <div className="relative z-[1] min-w-0">{headerAndRail}</div>
          </div>
        </div>
      ) : (
        <div className="container relative z-[1] min-w-0 max-w-7xl">{headerAndRail}</div>
      )}
    </section>
  );
};

export default HorizontalScroll;
