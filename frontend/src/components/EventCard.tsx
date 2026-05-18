import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventCardProps {
  slug: string;
  title: string;
  /** Δεύτερη γραμμή (π.χ. πρωτότυπος τίτλος όταν ο κύριος είναι ελληνικός). */
  titleSecondary?: string;
  subtitle: string;
  genre: string;
  duration: number;
  score?: number;
  /** Fallback όταν λείπει poster (π.χ. θέατρο) · οι ταινίες χρησιμοποιούν μόνο poster ή ουδέτερο φόντο */
  gradientFrom?: string;
  gradientTo?: string;
  posterUrl?: string;
  type: "movie" | "theater";
  badge?: string;
  className?: string;
  index?: number;
}

const EventCard = ({ slug, title, titleSecondary, subtitle, genre, duration, score, gradientFrom, gradientTo, posterUrl, type, badge, className = "", index = 0 }: EventCardProps) => {
  const showGradientFallback =
    !posterUrl && typeof gradientFrom === "string" && typeof gradientTo === "string";
  const subtitleLine = typeof subtitle === "string" && subtitle.trim() ? subtitle : "\u00a0";
  const posterAlt = titleSecondary ? `${title} · ${titleSecondary}` : title;

  return (
    <motion.div
      className={cn("h-full", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link
        to={`/${type === "movie" ? "movies" : "theater"}/${slug}`}
        className="group flex h-full flex-col overflow-hidden card-elevated"
      >
        <div
          className={cn(
            "relative aspect-[2/3] shrink-0 overflow-hidden",
            !posterUrl && !showGradientFallback && "bg-secondary",
          )}
          style={
            showGradientFallback ? { background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` } : undefined
          }
        >
          {posterUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- αφίσες Strapi, static export */}
              <img
                src={posterUrl}
                alt={posterAlt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </>
          )}
          {badge && (
            <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded bg-[#13143E] text-white z-10">
              {badge}
            </span>
          )}
          {score && (
            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-white text-xs font-bold text-[#13143E] rounded z-10">
              {score}/10
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col bg-white p-3">
          <h3
            className={cn(
              "mb-1 font-display text-base font-semibold leading-tight text-gray-900 line-clamp-2 group-hover:text-primary transition-colors",
              !titleSecondary && "min-h-[2.75rem]",
            )}
          >
            {title}
          </h3>
          {titleSecondary ? (
            <p className="-mt-0.5 mb-2 text-sm font-medium leading-snug text-gray-600 line-clamp-2">{titleSecondary}</p>
          ) : null}
          <p className={cn("mb-2 text-sm leading-snug text-gray-500 line-clamp-1", titleSecondary ? "min-h-0" : "min-h-[1.375rem]")}>{subtitleLine}</p>
          <div className="mt-auto flex items-end justify-between gap-2 pt-1">
            <span className="min-w-0 text-xs font-medium uppercase tracking-wider text-gray-400 line-clamp-1">
              {type === "movie" && genre ? `Είδος · ${genre}` : genre || "\u00a0"}
            </span>
            <div className="flex shrink-0 items-center gap-1 text-sm text-gray-400">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{duration}&nbsp;′</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default EventCard;