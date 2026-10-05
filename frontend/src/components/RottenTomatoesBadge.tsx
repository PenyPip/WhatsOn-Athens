import { cn } from "@/lib/utils";

type RottenTomatoesBadgeProps = {
  score: number;
  /** onDark = λευκό ποσοστό πάνω στο hero της ταινίας. */
  tone?: "default" | "onDark";
  className?: string;
};

function TomatoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path
        fill="#2f7a34"
        d="M16 3.2c1.6 2.1 2.6 3.2 5.4 3.4-2.2 1.5-4 1.6-5.4.7-1.4.9-3.2.8-5.4-.7 2.8-.2 3.8-1.3 5.4-3.4z"
      />
      <path fill="#245c28" d="M15.2 6.2c.4 1.8.2 3.2-.4 4.2 1-.3 1.8.1 2.3.8-1.2.3-2.4.2-3.4-.3.5-1.5.9-3.1 1.5-4.7z" />
      <circle cx="16" cy="18.2" r="9.2" fill="#f03a2e" />
      <ellipse cx="12.6" cy="15.2" rx="2.6" ry="1.5" fill="#ff8d84" opacity="0.85" />
    </svg>
  );
}

/** Ντομάτα + ποσοστό Tomatometer, χωρίς κόκκινο πλαίσιο. */
export default function RottenTomatoesBadge({
  score,
  tone = "default",
  className,
}: RottenTomatoesBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 font-bold leading-none tabular-nums",
        tone === "onDark" ? "text-sm text-white md:text-base" : "text-sm text-foreground",
        className,
      )}
      title={`Rotten Tomatoes ${score}%`}
    >
      <TomatoIcon className={tone === "onDark" ? "h-5 w-5" : "h-4 w-4"} />
      <span>{score}%</span>
    </span>
  );
}
