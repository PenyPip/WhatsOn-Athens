import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import RestaurantCard from "@/components/RestaurantCard";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useRestaurants } from "@/hooks/useStrapi";

const cuisines = ["Όλα", "Ελληνική", "Ιαπωνο-ελληνική", "Γαλλο-μεσογειακή", "Μοριακή Γαστρονομία"];
const priceRanges = ["Όλα", "€€", "€€€", "€€€€"];

const Dining = () => {
  const { data: restaurants, isLoading } = useRestaurants();
  const [cuisine, setCuisine] = useState("Όλα");
  const [price, setPrice] = useState("Όλα");
  const [showNewOnly, setShowNewOnly] = useState(false);

  const filtered = useMemo(() => {
    if (!restaurants) return [];
    let result = restaurants;
    if (cuisine !== "Όλα") result = result.filter((r) => r.cuisine === cuisine);
    if (price !== "Όλα") result = result.filter((r) => r.priceRange === price);
    if (showNewOnly) result = result.filter((r) => r.isNew);
    return result;
  }, [restaurants, cuisine, price, showNewOnly]);

  return (
    <div className="min-h-screen pt-36 pb-20 md:pb-8">
      <div className="section-black py-10 -mt-28 pt-36 mb-8">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">Φαγητό</h1>
            <p className="text-white/60 text-base">Εστιατόρια & γαστρονομικές εμπειρίες</p>
          </motion.div>
        </div>
      </div>

      <div className="container">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground mr-1 uppercase tracking-wider">Κουζίνα:</span>
          {cuisines.map((c) => (
            <button
              key={c}
              onClick={() => setCuisine(c)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-all border ${
                cuisine === c ? "bg-[#13143E] text-white border-[#13143E]" : "bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-8">
          <span className="text-sm text-muted-foreground mr-1 uppercase tracking-wider">Τιμή:</span>
          {priceRanges.map((p) => (
            <button
              key={p}
              onClick={() => setPrice(p)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-all border ${
                price === p ? "bg-[#13143E] text-white border-[#13143E]" : "bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setShowNewOnly(!showNewOnly)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all border ml-2 ${
              showNewOnly ? "bg-[#13143E] text-white border-[#13143E]" : "bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground"
            }`}
          >
            Νέα Μέρη
          </button>
        </div>

        {isLoading ? (
          <LoadingState message="Φόρτωση εστιατορίων..." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((r, i) => (
              <RestaurantCard key={r.id} restaurant={r} index={i} />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-base">
            <p>Δεν βρέθηκαν εστιατόρια για αυτά τα φίλτρα.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Dining;