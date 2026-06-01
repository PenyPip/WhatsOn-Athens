import { MapPin } from "lucide-react";
import { restaurantLocationQuery, restaurantMapsEmbedSrc } from "@/lib/restaurantLinks";
import type { StrapiRestaurant } from "@/lib/api";

type Props = {
  restaurant: Pick<StrapiRestaurant, "name" | "address" | "neighborhood" | "city">;
  className?: string;
};

const RestaurantLocationMap = ({ restaurant, className }: Props) => {
  const query = restaurantLocationQuery(restaurant);
  const embedSrc = restaurantMapsEmbedSrc(restaurant);
  const addressLine = typeof restaurant.address === "string" ? restaurant.address.trim() : "";

  if (!embedSrc && !addressLine && !query) {
    return (
      <div
        className={`flex h-64 items-center justify-center rounded-lg border border-border bg-secondary ${className ?? ""}`}
      >
        <p className="text-sm text-muted-foreground">Δεν υπάρχει διεύθυνση για χάρτη.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative h-64 overflow-hidden rounded-lg border border-border bg-secondary">
        {embedSrc ? (
          <iframe
            title={`Χάρτης — ${restaurant.name}`}
            src={embedSrc}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div>
              <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">{addressLine || query}</p>
            </div>
          </div>
        )}
      </div>
      {addressLine || query ? (
        <p className="mt-3 text-sm text-muted-foreground">{addressLine || query}</p>
      ) : null}
    </div>
  );
};

export default RestaurantLocationMap;
