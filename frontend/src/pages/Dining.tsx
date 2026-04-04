import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import RestaurantCard from "@/components/RestaurantCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { getRestaurants } from "@/lib/strapi";

const CUISINES = ["All", "greek", "italian", "japanese", "mediterranean", "mexican", "french", "american", "asian", "seafood", "vegetarian"];
const PRICE = ["All", "budget", "moderate", "upscale", "fine_dining"];
const PRICE_LABELS: Record<string, string> = {
  All: "All prices",
  budget: "€",
  moderate: "€€",
  upscale: "€€€",
  fine_dining: "€€€€",
};

const Dining = () => {
  const [selectedCuisine, setSelectedCuisine] = useState("All");
  const [selectedPrice, setSelectedPrice] = useState("All");
  const [showNewOnly, setShowNewOnly] = useState(false);

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ["restaurants"],
    queryFn: getRestaurants,
  });

  const filtered = restaurants.filter((r) => {
    if (selectedCuisine !== "All" && r.cuisine !== selectedCuisine) return false;
    if (selectedPrice !== "All" && r.price_range !== selectedPrice) return false;
    if (showNewOnly && !r.is_new) return false;
    return true;
  });

  return (
    <div className="min-h-screen pt-20 pb-20 md:pb-8">
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Dining</h1>
          <p className="text-muted-foreground">New openings & editor's picks across Athens</p>
        </div>

        {/* Filters */}
        <div className="space-y-3 mb-8">
          {/* New only toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewOnly(!showNewOnly)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                showNewOnly ? "bg-primary text-primary-foreground" : "glass-card text-muted-foreground hover:text-foreground"
              }`}
            >
              ✦ New in Town
            </button>
          </div>

          {/* Cuisine */}
          <div className="flex gap-2 flex-wrap">
            {CUISINES.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCuisine(c)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedCuisine === c
                    ? "bg-primary text-primary-foreground"
                    : "glass-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {c === "All" ? "All cuisines" : c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>

          {/* Price */}
          <div className="flex gap-2 flex-wrap">
            {PRICE.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPrice(p)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedPrice === p
                    ? "bg-primary text-primary-foreground"
                    : "glass-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {PRICE_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
            : filtered.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            No restaurants found for these filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default Dining;
