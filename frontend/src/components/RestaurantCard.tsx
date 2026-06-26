import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import PosterPicture from "@/components/PosterPicture";
import { cn } from "@/lib/utils";
import type { StrapiRestaurant } from "@/lib/api";
import { restaurantAreaLine } from "@/lib/restaurantLinks";
import { POSTER_BADGE_CORNER_TOP_LEFT, POSTER_BADGE_TOP_LEFT } from "@/lib/posterBadges";

const RestaurantCard = ({ restaurant }: { restaurant: StrapiRestaurant; index?: number }) => {
  const isNew = restaurant.isNew;

  return (
    <div>
      <Link
        to={`/dining/${restaurant.slug}`}
        className="group block card-elevated overflow-hidden"
      >
        <div
          className={cn(
            "relative aspect-[4/3] overflow-hidden bg-muted",
            !restaurant.posterUrl && "bg-secondary",
          )}
        >
          {restaurant.posterUrl ? (
            <PosterPicture
              src={restaurant.posterUrl}
              alt={restaurant.name}
              width={640}
              height={480}
              loading="lazy"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : null}
          {isNew ? (
            <span className={`${POSTER_BADGE_CORNER_TOP_LEFT} ${POSTER_BADGE_TOP_LEFT} text-xs`}>Νέο</span>
          ) : null}
          {restaurant.editorialScore ? (
            <div className="absolute bottom-2 left-2 z-10 rounded bg-white px-2 py-0.5 text-sm font-bold text-[#13143E]">
              {restaurant.editorialScore}/10
            </div>
          ) : null}
        </div>
        <div className="p-3">
          <h3 className="font-display mb-1 text-base font-semibold leading-tight transition-colors group-hover:text-primary">
            {restaurant.name}
          </h3>
          <p className="mb-2 text-sm text-muted-foreground">
            {[restaurant.category, restaurant.cuisine].filter(Boolean).join(" · ")}
          </p>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {restaurantAreaLine(restaurant) || restaurant.neighborhood}
            </span>
            <span className="text-sm font-medium text-foreground">{restaurant.priceRange}</span>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default RestaurantCard;
