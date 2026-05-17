import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useMovies } from "@/hooks/useStrapi";

const Hero = () => {
  const { data: movies } = useMovies();
  const featured = movies?.[2] ?? movies?.[0];

  if (!featured) return null;

  return (
    <section className="relative h-[75vh] min-h-[500px] overflow-hidden bg-[#111111]">
      <div className="absolute inset-0">
        {featured.posterUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- hero poster Strapi, static export */}
            <img
              src={featured.posterUrl}
              alt=""
              className="h-full w-full object-cover opacity-55"
            />
          </>
        ) : (
          <div className="h-full w-full bg-[#13143E]" />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/40 to-transparent" />

      <div className="relative z-10 container h-full flex items-end pb-16 md:pb-20">
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <span className="mb-3 block font-body text-[10px] uppercase tracking-[0.28em] text-amber-200/90 md:text-[11px]">
            Καλοκαίρι · θερινά σινεμά & θέατρο που ταξιδεύει
          </span>
          <span className="mb-2 inline-flex rounded border border-white/15 bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/95">
            Είδος · {featured.genre}
          </span>
          <span className="mb-2 block text-xs font-body uppercase tracking-[0.2em] text-white/55">
            Προτεινόμενη ταινία
          </span>
          <div className="w-16 h-0.5 bg-amber-400/85 mb-5" />
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
            <span className="text-white/40 text-sm">{featured.duration}&apos;</span>
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
