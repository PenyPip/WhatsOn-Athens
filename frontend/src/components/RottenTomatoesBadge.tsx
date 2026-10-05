import { cn } from "@/lib/utils";

type RottenTomatoesBadgeProps = {
  score: number;
  className?: string;
};

/** Βαθμός Tomatometer δίπλα στον τίτλο. */
export default function RottenTomatoesBadge({ score, className }: RottenTomatoesBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-sm font-extrabold tracking-tight text-white shadow-md",
        className,
      )}
      style={{ backgroundColor: "#FA320A" }}
      title={`Rotten Tomatoes ${score}%`}
    >
      <span>RT</span>
      <span className="tabular-nums">{score}%</span>
    </span>
  );
}
