import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, MapPin, Phone, Globe, Instagram, ArrowLeft, Calendar } from "lucide-react";
import { getRestaurant, getRestaurants } from "@/lib/strapi";
import RestaurantCard from "@/components/RestaurantCard";

const PRICE_LABELS: Record<string, string> = {
  budget: "€ — Budget friendly",
  moderate: "€€ — Moderate",
  upscale: "€€€ — Upscale",
  fine_dining: "€€€€ — Fine dining",
};

const RestaurantDetail = () => {
  const { slug } = useParams();

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ["restaurant", slug],
    queryFn: () => getRestaurant(slug!),
    enabled: !!slug,
  });

  const { data: allRestaurants = [] } = useQuery({
    queryKey: ["restaurants"],
    queryFn: getRestaurants,
  });

  const related = allRestaurants.filter((r) => r.slug !== slug).slice(0, 4);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl mb-2">Not Found</h1>
          <Link to="/dining" className="text-primary text-sm">Back to Dining</Link>
        </div>
      </div>
    );
  }

  const posterUrl = restaurant.poster?.url || null;
  const gFrom = restaurant.gradient_from || "#1a1a2e";
  const gTo = restaurant.gradient_to || "#e8a020";

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Hero */}
      <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <div
          className="absolute inset-0 scale-110 blur-3xl opacity-60"
          style={{
            background: posterUrl
              ? `url(${posterUrl}) center/cover`
              : `linear-gradient(135deg, ${gFrom}, ${gTo})`
          }}
        />
        <div className="absolute inset-0 gradient-hero-overlay" />

        <div className="relative z-10 container h-full flex items-end pb-12">
          <div className="flex gap-6 items-end max-w-3xl animate-fade-up">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={restaurant.name}
                className="hidden md:block w-48 h-48 rounded-lg flex-shrink-0 shadow-2xl object-cover"
              />
            ) : (
              <div
                className="hidden md:block w-48 h-48 rounded-lg flex-shrink-0 shadow-2xl"
                style={{ background: `linear-gradient(135deg, ${gFrom}, ${gTo})` }}
              />
            )}
            <div>
              <Link
                to="/dining"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
              >
                <ArrowLeft className="w-3 h-3" /> Back to Dining
              </Link>

              <div className="flex items-center gap-2 mb-3">
                {restaurant.is_new && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground font-semibold">
                    New in Town
                  </span>
                )}
                {restaurant.editorial_score && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20">
                    <Star className="w-3 h-3 text-primary fill-primary" />
                    <span className="text-xs font-semibold text-primary">{restaurant.editorial_score}</span>
                  </div>
                )}
              </div>

              <h1 className="font-display text-3xl md:text-5xl font-bold mb-3">{restaurant.name}</h1>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="capitalize">{restaurant.cuisine}</span>
                <span>{PRICE_LABELS[restaurant.price_range]}</span>
                {restaurant.neighborhood && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {restaurant.neighborhood}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container py-10 space-y-12">
        {/* Synopsis + Info */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h2 className="font-display text-xl font-semibold mb-3">About</h2>
              <p className="text-muted-foreground leading-relaxed">{restaurant.synopsis}</p>
            </div>

            {/* Editorial Review */}
            {restaurant.editorial_review && (
              <div className="glass-card rounded-lg p-6 border-l-2 border-primary">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-primary fill-primary" />
                  <span className="text-primary font-bold">{restaurant.editorial_score}</span>
                  <span className="text-xs text-muted-foreground ml-1">Editorial Review</span>
                </div>
                <p className="text-sm leading-relaxed italic mb-3">"{restaurant.editorial_review}"</p>
                {restaurant.editorial_author && (
                  <p className="text-xs text-muted-foreground">— {restaurant.editorial_author}</p>
                )}
              </div>
            )}
          </div>

          {/* Info sidebar */}
          <div className="glass-card rounded-lg p-5 space-y-4 h-fit">
            {restaurant.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Address</p>
                  <p className="text-sm">{restaurant.address}</p>
                </div>
              </div>
            )}
            {restaurant.phone && (
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Phone</p>
                  <a href={`tel:${restaurant.phone}`} className="text-sm hover:text-primary transition-colors">
                    {restaurant.phone}
                  </a>
                </div>
              </div>
            )}
            {restaurant.opening_date && (
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Opened</p>
                  <p className="text-sm">
                    {new Date(restaurant.opening_date).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              {restaurant.website && (
                <a
                  href={restaurant.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" /> Website
                </a>
              )}
              {restaurant.instagram && (
                <a
                  href={`https://instagram.com/${restaurant.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Instagram className="w-3.5 h-3.5" /> Instagram
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Gallery */}
        {restaurant.gallery && restaurant.gallery.length > 0 && (
          <div>
            <h2 className="font-display text-xl font-semibold mb-4">Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {restaurant.gallery.map((img, i) => (
                <img
                  key={i}
                  src={img.url}
                  alt={`${restaurant.name} ${i + 1}`}
                  className="w-full aspect-[4/3] object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        )}

        {/* Related */}
        {related.length > 0 && (
          <div>
            <h2 className="font-display text-xl font-semibold mb-4">Also worth a visit</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {related.map((r) => (
                <RestaurantCard key={r.id} restaurant={r} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantDetail;
