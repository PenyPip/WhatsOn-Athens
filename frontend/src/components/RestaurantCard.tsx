import { Link } from "react-router-dom";
import { Star, MapPin } from "lucide-react";
import { Restaurant } from "@/lib/strapi";

const PRICE_LABELS: Record<string, string> = {
  budget: "€",
  moderate: "€€",
  upscale: "€€€",
  fine_dining: "€€€€",
};

const RestaurantCard = ({ restaurant }: { restaurant: Restaurant }) => {
  const posterUrl = restaurant.poster?.url || null;

  return (
    <Link
      to={`/dining/${restaurant.slug}`}
      className="group block glass-card rounded-lg overflow-hidden transition-all duration-300 glass-card-hover"
    >
      {/* Poster */}
      <div
        className="aspect-[4/3] relative overflow-hidden"
        style={
          posterUrl
            ? undefined
            : { background: `linear-gradient(135deg, ${restaurant.gradient_from}, ${restaurant.gradient_to})` }
        }
      >
        {posterUrl && (
          <img
            src={posterUrl}
            alt={restaurant.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {restaurant.is_new && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground font-semibold">
              New
            </span>
          )}
        </div>

        <div className="absolute bottom-2 left-2 right-2">
          {restaurant.editorial_score && (
            <div className="flex items-center gap-1 mb-1">
              <Star className="w-3 h-3 text-primary fill-primary" />
              <span className="text-xs font-bold text-primary">{restaurant.editorial_score}</span>
            </div>
          )}
          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground capitalize">
            {restaurant.cuisine}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-display font-semibold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-1">
            {restaurant.name}
          </h3>
          <span className="text-xs text-muted-foreground flex-shrink-0 font-medium">
            {PRICE_LABELS[restaurant.price_range]}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span>{restaurant.neighborhood}</span>
        </div>
      </div>
    </Link>
  );
};

export default RestaurantCard;
