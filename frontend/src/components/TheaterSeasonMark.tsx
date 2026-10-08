import { formatTheaterSeasonYear } from "@/lib/theaterSeason";
import { cn } from "@/lib/utils";

type TheaterSeasonMarkProps = {
  year?: number | null;
  tone?: "default" | "onDark";
  className?: string;
};

/** Ετικέτα χρόνου παράστασης. Ίδια διατύπωση παντού, έξω από τον τίτλο. */
export default function TheaterSeasonMark({ year, tone = "default", className }: TheaterSeasonMarkProps) {
  const label = formatTheaterSeasonYear(year);
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-body text-[11px] font-bold leading-none tracking-wide",
        tone === "onDark" ? "bg-white/15 text-white" : "bg-[#7C2B76]/10 text-[#7C2B76]",
        className,
      )}
    >
      {label}
    </span>
  );
}
