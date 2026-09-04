import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type MovieLikePromoProps = {
  /** Σκούρο hero στη σελίδα ταινίας. */
  variant?: "page" | "hero";
  className?: string;
};

/** Επεξήγηση like/seen στο κενό του movie hero (παράλληλο με TheaterLikePromo). */
export default function MovieLikePromo({ variant = "page", className }: MovieLikePromoProps) {
  const isHero = variant === "hero";

  if (isHero) {
    return (
      <p className={cn("max-w-xl text-sm leading-relaxed text-white/85", className)}>
        <Heart className="mr-1.5 inline h-4 w-4 shrink-0 fill-rose-400/80 text-rose-300 align-[-2px]" aria-hidden />
        <span className="font-semibold text-white">Like</span>
        {" "}
        για αγαπημένα ·{" "}
        <span className="font-semibold text-white">μάτι</span>
        {" "}
        όταν το είδες.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-rose-200/70 bg-gradient-to-r from-rose-50/95 to-amber-50/60 px-4 py-3.5 shadow-sm",
        className,
      )}
    >
      <Heart className="mt-0.5 h-5 w-5 shrink-0 fill-rose-500/20 text-rose-500" aria-hidden />
      <p className="text-sm leading-snug text-[#13143E]">
        <span className="font-semibold">Κάνε like</span>
        {" "}
        στην ταινία που θες να δεις — μένει στα αγαπημένα σου. Σημείωσε «Το είδα» όταν την έχεις δει.
      </p>
    </div>
  );
}
