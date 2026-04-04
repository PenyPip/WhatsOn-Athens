import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import EventCard from "@/components/EventCard";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useTheaterShows } from "@/hooks/useStrapi";

const tags = ["Όλα", "Δράμα", "Μιούζικαλ", "Κωμωδία", "Χορός", "Κλασικό"];

const TheaterPage = () => {
  const { data: theaterShows, isLoading } = useTheaterShows();
  const [tag, setTag] = useState("Όλα");

  const filtered = useMemo(() => {
    if (!theaterShows) return [];
    if (tag === "Όλα") return theaterShows;
    return theaterShows.filter((s) => s.tags?.includes(tag) || s.genre === tag);
  }, [theaterShows, tag]);

  return (
    <div className="min-h-screen pt-28 pb-20 md:pb-8">
      <div className="section-black py-10 -mt-28 pt-36 mb-8">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">Θέατρο</h1>
            <p className="text-white/50 text-sm">Στη σκηνή σε Αθήνα & Θεσσαλονίκη</p>
          </motion.div>
        </div>
      </div>

      <div className="container">
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <span className="text-xs text-muted-foreground mr-1 uppercase tracking-wider">Είδος:</span>
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all border ${
                tag === t ? "bg-[#111111] text-white border-[#111111]" : "bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingState message="Φόρτωση παραστάσεων..." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((show, i) => (
              <EventCard
                key={show.id} slug={show.slug} title={show.title} subtitle={show.director}
                genre={show.genre} duration={show.duration}
                gradientFrom={show.gradientFrom} gradientTo={show.gradientTo}
                type="theater" index={i}
                badge={show.isPremiere ? "Πρεμιέρα" : show.isLastShows ? "Τελευταίες" : undefined}
              />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default TheaterPage;
