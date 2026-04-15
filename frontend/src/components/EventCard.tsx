import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

interface EventCardProps {
  slug: string;
  title: string;
  subtitle: string;
  genre: string;
  duration: number;
  score?: number;
  gradientFrom: string;
  gradientTo: string;
  posterUrl?: string;
  type: "movie" | "theater";
  badge?: string;
  className?: string;
  index?: number;
}

const EventCard = ({ slug, title, subtitle, genre, duration, score, gradientFrom, gradientTo, posterUrl, type, badge, className = "", index = 0 }: EventCardProps) => {
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
          className="aspect-[2/3] relative overflow-hidden"
          style={!posterUrl ? { background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` } : undefined}
        >
          {posterUrl && (
            <img
              src={posterUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          {badge && (
            <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-[#111111] text-white z-10">
              {badge}
            </span>
          )}
          {score && (
            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-white text-[11px] font-bold text-[#111111] rounded z-10">
              {score}/10
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-display font-semibold text-sm leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{genre}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{duration}'</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default EventCard;