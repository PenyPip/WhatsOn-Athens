import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import type { Restaurant } from "@/data/mockData";
import type { StrapiRestaurant } from "@/lib/api";

const RestaurantCard = ({ restaurant, index = 0 }: { restaurant: Restaurant | StrapiRestaurant; index?: number }) => {
  const isNew = restaurant.isNew;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link
        to={`/dining/${restaurant.slug}`}
        className="group block card-elevated overflow-hidden"
      >
        <div
          className="aspect-[4/3] relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${restaurant.gradientFrom}, ${restaurant.gradientTo})` }}
        >
          {isNew && (
            <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-[#111111] text-white">
              Νέο
            </span>
          )}
          {restaurant.editorialScore && (
            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-white text-[11px] font-bold text-[#111111] rounded">
              {restaurant.editorialScore}/10
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-display font-semibold text-sm leading-tight mb-1 group-hover:text-primary transition-colors">
            {restaurant.name}
          </h3>
          <p className="text-xs text-muted-foreground mb-2">{restaurant.cuisine}</p>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {restaurant.neighborhood}
            </span>
            <span className="text-xs font-medium text-foreground">{restaurant.priceRange}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default RestaurantCard;
