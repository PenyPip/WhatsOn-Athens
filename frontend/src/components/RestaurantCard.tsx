import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import type { StrapiRestaurant } from "@/lib/api";

const RestaurantCard = ({ restaurant }: { restaurant: StrapiRestaurant; index?: number }) => {
  const isNew = restaurant.isNew;

  return (
    <div>
      <Link
        to={`/dining/${restaurant.slug}`}
        className="group block card-elevated overflow-hidden"
      >
        <div
          className="aspect-[4/3] relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${restaurant.gradientFrom}, ${restaurant.gradientTo})` }}
        >
          {isNew && (
            <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded bg-[#13143E] text-white">
              Νέο
            </span>
          )}
          {restaurant.editorialScore && (
            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-white text-sm font-bold text-[#13143E] rounded">
              {restaurant.editorialScore}/10
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-display font-semibold text-base leading-tight mb-1 group-hover:text-primary transition-colors">
            {restaurant.name}
          </h3>
          <p className="text-sm text-muted-foreground mb-2">{restaurant.cuisine}</p>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              {restaurant.neighborhood}
            </span>
            <span className="text-sm font-medium text-foreground">{restaurant.priceRange}</span>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default RestaurantCard;