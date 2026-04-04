import { useQuery } from "@tanstack/react-query";
import { MapPin, Users } from "lucide-react";
import { getVenues } from "@/lib/strapi";

const Venues = () => {
  const { data: venues = [], isLoading } = useQuery({
    queryKey: ["venues"],
    queryFn: getVenues,
  });

  return (
    <div className="min-h-screen pt-20 pb-20 md:pb-8">
      <div className="container py-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Venues</h1>
        <p className="text-muted-foreground mb-8">Cinemas and theaters across Greece</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-card rounded-lg p-5 animate-pulse h-40" />
              ))
            : venues.map((venue) => (
                <div key={venue.id} className="glass-card rounded-lg p-5 glass-card-hover transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-display font-semibold text-lg leading-tight">{venue.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize ml-2 flex-shrink-0">
                      {venue.city}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{venue.address}</span>
                    </div>
                    {venue.seats_total && (
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{venue.seats_total.toLocaleString()} seats</span>
                      </div>
                    )}
                  </div>
                  {venue.google_maps_url && (
                    <a
                      href={venue.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-4 text-xs text-primary hover:underline"
                    >
                      View on map →
                    </a>
                  )}
                </div>
              ))}
        </div>
      </div>
    </div>
  );
};

export default Venues;
