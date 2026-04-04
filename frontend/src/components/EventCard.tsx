import { Link } from "react-router-dom";
import { Star, Clock } from "lucide-react";

interface EventCardProps {
  slug: string;
  title: string;
  subtitle: string;
  genre: string;
  duration: number;
  score?: number;
  gradientFrom: string;
  gradientTo: string;
  type: "movie" | "theater";
  className?: string;
}

const EventCard = ({ slug, title, subtitle, genre, duration, score, gradientFrom, gradientTo, type, className = "" }: EventCardProps) => {
  return (
    <Link
      to={`/${type === "movie" ? "movies" : "theater"}/${slug}`}
      className={`group block glass-card rounded-lg overflow-hidden transition-all duration-300 glass-card-hover ${className}`}
    >
      {/* Gradient Poster Placeholder */}
      <div
        className="aspect-[2/3] relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          {score && (
            <div className="flex items-center gap-1 mb-2">
              <Star className="w-3.5 h-3.5 text-primary fill-primary" />
              <span className="text-sm font-semibold text-primary">{score}</span>
            </div>
          )}
          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground mb-1">
            {genre}
          </span>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-display font-semibold text-sm leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{duration} min</span>
        </div>
      </div>
    </Link>
  );
};

export default EventCard;
