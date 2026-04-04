import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Phone, Globe, Instagram, ArrowLeft, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRestaurants, useUserReviews } from "@/hooks/useStrapi";
import RestaurantCard from "@/components/RestaurantCard";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";

const DiningDetail = () => {
  const { slug } = useParams();
  const { data: restaurants, isLoading } = useRestaurants();
  const { data: userReviews } = useUserReviews();

  const restaurant = restaurants?.find((r) => r.slug === slug);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-28">
        <LoadingState />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen pt-28 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl mb-2">Δεν βρέθηκε</h1>
          <Link to="/dining" className="text-primary text-sm">Πίσω στο Φαγητό</Link>
        </div>
      </div>
    );
  }

  const relatedUserReviews = (userReviews ?? []).filter((r) => r.contentTitle === restaurant.name);
  const relatedRestaurants = (restaurants ?? []).filter((r) => r.slug !== slug).slice(0, 3);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <section className="relative min-h-[45vh] overflow-hidden bg-[#111111]">
        <div
          className="absolute inset-0 opacity-40"
          style={{ background: `linear-gradient(135deg, ${restaurant.gradientFrom}, ${restaurant.gradientTo})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-transparent" />
        <div className="relative z-10 container h-full flex items-end pb-12 pt-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link to="/dining" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors mb-4">
              <ArrowLeft className="w-3 h-3" /> Πίσω στο Φαγητό
            </Link>
            <div className="flex items-center gap-3 mb-3">
              {restaurant.isNew && (
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-white text-[#111111]">Νέο</span>
              )}
              {restaurant.editorialScore && (
                <span className="px-2 py-0.5 bg-white text-[11px] font-bold text-[#111111] rounded">{restaurant.editorialScore}/10</span>
              )}
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-4 text-white">{restaurant.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/50">
              <span className="flex items-center gap-1"><UtensilsCrossed className="w-3.5 h-3.5" /> {restaurant.cuisine}</span>
              <span>·</span>
              <span>{restaurant.priceRange}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {restaurant.neighborhood}, {restaurant.city}</span>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container mt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-2 space-y-10">
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              <h2 className="font-display text-xl font-semibold mb-3">Σχετικά</h2>
              <p className="text-muted-foreground leading-relaxed">{restaurant.synopsis}</p>
            </motion.section>

            {restaurant.editorialReview && (
              <motion.section
                className="card-elevated p-6 border-l-4 border-l-[#111111]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block mb-3">Κριτική Συντάκτη</span>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-bold text-foreground text-lg">{restaurant.editorialScore}/10</span>
                </div>
                <p className="text-foreground leading-relaxed italic text-lg">"{restaurant.editorialReview}"</p>
                <p className="text-sm text-muted-foreground mt-4">— {restaurant.editorialAuthor}</p>
              </motion.section>
            )}

            <section>
              <h2 className="font-display text-xl font-semibold mb-4">Κριτικές Χρηστών</h2>
              {relatedUserReviews.length > 0 ? (
                relatedUserReviews.map((r) => (
                  <div key={r.id} className="card-elevated p-4 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{r.userName}</span>
                      <span className="text-xs font-bold">{r.rating}/5 ★</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.body}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground mb-4">Δεν υπάρχουν κριτικές ακόμα.</p>
              )}
              <div className="card-elevated p-6 text-center border-2 border-[#111111] mt-4">
                <h3 className="font-display font-semibold mb-2">Γράψε Κριτική</h3>
                <p className="text-sm text-muted-foreground mb-3">Σύνδεση για κριτική</p>
                <Button variant="outline" size="sm" className="border-foreground text-foreground hover:bg-foreground hover:text-background">Σύνδεση</Button>
              </div>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold mb-4">Τοποθεσία</h2>
              <div className="h-64 rounded-lg bg-secondary border border-border flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{restaurant.address}</p>
                  <p className="text-xs text-muted-foreground mt-1">Χάρτης</p>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <motion.div
              className="card-elevated p-6 sticky top-28"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h3 className="font-display font-semibold mb-4">Πληροφορίες</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">Κουζίνα</span>
                  <p className="font-medium mt-1">{restaurant.cuisine}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">Τιμές</span>
                  <p className="font-medium mt-1">{restaurant.priceRange}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">Γειτονιά</span>
                  <p className="font-medium mt-1">{restaurant.neighborhood}, {restaurant.city}</p>
                </div>
                <div className="border-t border-border pt-4 space-y-3">
                  <p className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{restaurant.address}</span>
                  </p>
                  {restaurant.phone && (
                    <p className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{restaurant.phone}</span>
                    </p>
                  )}
                  {restaurant.website && (
                    <a href={restaurant.website} className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Globe className="w-4 h-4" />
                      <span>Website</span>
                    </a>
                  )}
                  {restaurant.instagram && (
                    <p className="flex items-center gap-2 text-sm">
                      <Instagram className="w-4 h-4 text-muted-foreground" />
                      <span>{restaurant.instagram}</span>
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <section className="mt-16">
          <h2 className="font-display text-xl font-semibold mb-6">Μπορεί να σου αρέσει</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {relatedRestaurants.map((r, i) => (
              <RestaurantCard key={r.id} restaurant={r} index={i} />
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default DiningDetail;
