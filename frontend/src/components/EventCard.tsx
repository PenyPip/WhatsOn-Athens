import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventCardProps {
  slug: string;
  title: string;
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

const EventCard = ({ slug, title, subtitle, genre, duration, score, gradientFrom, gradientTo, posterUrl, type, badge, className = "", index = 0 }: EventCardProps) => {
  const showGradientFallback =
    !posterUrl && typeof gradientFrom === "string" && typeof gradientTo === "string";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link
        to={`/${type === "movie" ? "movies" : "theater"}/${slug}`}
        className={`group block card-elevated overflow-hidden ${className}`}
      >
        <div
          className={cn(
            "aspect-[2/3] relative overflow-hidden",
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
                alt={title}
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
        <div className="p-3 bg-white">
          <h3 className="font-display font-semibold text-base leading-tight mb-1 text-gray-900 group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
          <p className="text-sm text-gray-500 mb-2">{subtitle}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">{type === "movie" && genre ? `Είδος · ${genre}` : genre}</span>
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{duration}&nbsp;′</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default EventCard;