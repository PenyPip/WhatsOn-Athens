import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import EventCard from "@/components/EventCard";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useMovies } from "@/hooks/useStrapi";

const genres = ["Όλα", "Δράμα", "Κωμωδία", "Θρίλερ", "Επιστημονική Φαντασία"];
const sortOptions = [
  { label: "Ημερομηνία", value: "date" },
  { label: "Βαθμολογία", value: "score" },
];

const Movies = () => {
  const { data: movies, isLoading } = useMovies();
  const [genre, setGenre] = useState("Όλα");
  const [sort, setSort] = useState("date");

  const filtered = useMemo(() => {
    if (!movies) return [];
    let result = genre === "Όλα" ? movies : movies.filter((m) => m.genre === genre);
    if (sort === "date") result = [...result].sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
    if (sort === "score") result = [...result].sort((a, b) => b.criticScore - a.criticScore);
    return result;
  }, [movies, genre, sort]);

  return (
    <div className="min-h-screen pt-28 pb-20 md:pb-8">
      <div className="section-black py-10 -mt-28 pt-36 mb-8">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">Ταινίες</h1>
            <p className="text-white/50 text-sm">Τώρα στα σινεμά σε όλη την Ελλάδα</p>
          </motion.div>
        </div>
      </div>

      <div className="container">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground mr-1 uppercase tracking-wider">Είδος:</span>
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all border ${
                genre === g ? "bg-[#111111] text-white border-[#111111]" : "bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-8">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Ταξινόμηση:</span>
          {sortOptions.map((s) => (
            <button
              key={s.value}
              onClick={() => setSort(s.value)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                sort === s.value ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingState message="Φόρτωση ταινιών..." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((movie, i) => (
              <EventCard
                key={movie.id} slug={movie.slug} title={movie.title} subtitle={movie.director}
                genre={movie.genre} duration={movie.duration} score={movie.criticScore}
                gradientFrom={movie.gradientFrom} gradientTo={movie.gradientTo}
                type="movie" index={i}
              />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p>Δεν βρέθηκαν ταινίες για αυτό το φίλτρο.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Movies;
