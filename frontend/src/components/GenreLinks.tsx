import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { GenreLinkItem } from "@/lib/movieGenreLinks";
import { moviesGenreHref } from "@/lib/movieGenreLinks";

type GenreLinksProps = {
  items: GenreLinkItem[];
  /** Ετικέτα πριν τα chips (π.χ. «Είδος»). */
  prefix?: string;
  variant?: "hero" | "default" | "inline";
  className?: string;
};

/** Clickable είδη ταινίας → λίστα με φίλτρο genre. */
export default function GenreLinks({ items, prefix, variant = "default", className }: GenreLinksProps) {
  if (!items.length) return null;

  const chipClass =
    variant === "hero"
      ? "rounded border border-white/20 bg-white/10 px-2 py-0.5 text-sm font-medium text-white transition-colors hover:border-white/40 hover:bg-white/20"
      : variant === "inline"
        ? "font-medium text-primary underline-offset-2 hover:underline"
        : "rounded-md border border-border/80 bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 md:text-sm";

  const wrap = (
    <>
      {items.map((item) => (
        <Link
          key={item.slug}
          to={moviesGenreHref(item.slug)}
          className={chipClass}
          title={`Όλες οι ταινίες — ${item.label}`}
        >
          {item.label}
        </Link>
      ))}
    </>
  );

  if (variant === "hero") {
    return (
      <span className={cn("flex flex-wrap items-center gap-1.5", className)}>
        {prefix ? (
          <span className="text-white/55 text-xs font-semibold uppercase tracking-wider">{prefix}</span>
        ) : null}
        {wrap}
      </span>
    );
  }

  if (variant === "inline") {
    return (
      <span className={cn("inline-flex flex-wrap items-center gap-x-1 gap-y-0.5", className)}>
        {items.map((item, i) => (
          <span key={item.slug} className="inline-flex items-center gap-1">
            {i > 0 ? <span className="text-muted-foreground">·</span> : null}
            <Link to={moviesGenreHref(item.slug)} className={chipClass} title={`Όλες οι ταινίες — ${item.label}`}>
              {item.label}
            </Link>
          </span>
        ))}
      </span>
    );
  }

  return <div className={cn("flex flex-wrap gap-1.5", className)}>{wrap}</div>;
}
