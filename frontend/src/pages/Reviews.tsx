import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import EditorialCard from "@/components/EditorialCard";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useEditorialReviews } from "@/hooks/useStrapi";

const categories = ["Όλα", "Ταινία", "Θέατρο", "Φαγητό"];
const categoryMap: Record<string, string> = { "Ταινία": "movie", "Θέατρο": "theater", "Φαγητό": "restaurant" };

const Reviews = () => {
  const { data: editorialReviews, isLoading } = useEditorialReviews();
  const [category, setCategory] = useState("Όλα");

  const filtered = useMemo(() => {
    if (!editorialReviews) return [];
    if (category === "Όλα") return editorialReviews;
    return editorialReviews.filter((r) => r.category === categoryMap[category]);
  }, [editorialReviews, category]);

  return (
    <div className="min-h-screen pt-28 pb-20 md:pb-8">
      <div className="section-black py-10 -mt-28 pt-36 mb-8">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">Κριτικές</h1>
            <p className="text-white/50 text-sm">Κριτικές από τη συντακτική ομάδα</p>
          </motion.div>
        </div>
      </div>

      <div className="container">
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all border ${
                category === c ? "bg-[#111111] text-white border-[#111111]" : "bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingState message="Φόρτωση κριτικών..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((review, i) => (
              <EditorialCard key={review.id} review={review} index={i} />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p>Δεν βρέθηκαν κριτικές για αυτή την κατηγορία.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Reviews;
