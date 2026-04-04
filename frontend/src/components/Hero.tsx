import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useMovies } from "@/hooks/useStrapi";

const Hero = () => {
  const { data: movies } = useMovies();
  const featured = movies?.[2] ?? movies?.[0];

  if (!featured) return null;

  return (
    <section className="relative h-[75vh] min-h-[500px] overflow-hidden bg-[#111111]">
      <div
        className="absolute inset-0 opacity-50"
        style={{ background: `linear-gradient(135deg, ${featured.gradientFrom}, ${featured.gradientTo})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/40 to-transparent" />

      <div className="relative z-10 container h-full flex items-end pb-16 md:pb-20">
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <span className="text-xs font-body uppercase tracking-[0.2em] text-white/50 mb-4 block">
            Προτεινόμενο
          </span>
          <div className="w-16 h-0.5 bg-primary mb-6" />
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4 leading-tight text-white">
            {featured.title}
          </h1>
          <p className="text-white/60 text-base md:text-lg mb-6 leading-relaxed max-w-lg font-body">
            {featured.synopsis}
          </p>
          <div className="flex items-center gap-4">
            <Link
              to={`/movies/${featured.slug}`}
              className="inline-flex items-center px-6 py-3 bg-white text-[#111111] text-sm font-semibold rounded hover:bg-white/90 transition-colors"
            >
              Κράτηση Εισιτηρίου
            </Link>
            <span className="text-white/40 text-sm">
              {featured.genre} · {featured.duration}'
            </span>
          </div>
          <p className="text-xs text-white/30 mt-6 font-body">
            Σκηνοθεσία: {featured.director} · {featured.cast?.slice(0, 3).join(", ")}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
