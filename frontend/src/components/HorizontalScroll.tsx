import { ReactNode, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HorizontalScrollProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

const HorizontalScroll = ({ title, subtitle, children }: HorizontalScrollProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
    }
  };

  return (
    <section className="py-10">
      <div className="container">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">{title}</h2>
            {subtitle && <p className="text-base text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => scroll("left")} className="p-2 rounded-full border border-foreground/15 hover:bg-foreground hover:text-background transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => scroll("right")} className="p-2 rounded-full border border-foreground/15 hover:bg-foreground hover:text-background transition-colors">
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