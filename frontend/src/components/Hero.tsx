import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useMovies, useTheaterShows, useHomeLayout } from "@/hooks/useStrapi";
import { layoutShowsHero } from "@/config/home";
import type { StrapiMovie, StrapiTheaterShow } from "@/lib/api";

function clampIndex(n: number, length: number): number {
  if (length <= 0) return 0;
  if (Number.isNaN(n)) return Math.min(2, Math.max(0, length - 1));
  return Math.max(0, Math.min(length - 1, n));
}

const Hero = () => {
  const layout = useHomeLayout();
  const { data: movies } = useMovies();
  const { data: theaterShows } = useTheaterShows();

  if (!layoutShowsHero(layout)) return null;

  const theaterSlug = layout.heroTheaterSlug ?? undefined;
  const movieSlug = layout.heroMovieSlug ?? undefined;

  let theater: StrapiTheaterShow | null = null;
  let movie: StrapiMovie | null = null;

  if (theaterSlug) {
    theater = theaterShows?.find((s) => s.slug === theaterSlug) ?? null;
  }
  if (!theater && movieSlug) {
    movie = movies?.find((m) => m.slug === movieSlug) ?? null;
  }
  if (!theater && !movie && movies?.length) {
    const idx = clampIndex(layout.featuredMovieIndex, movies.length);
    movie = movies[idx] ?? movies[0] ?? null;
  }

  const featured = theater ?? movie;
  if (!featured) return null;

  const isTheater = Boolean(theater);

  const to = isTheater ? `/theater/${(featured as StrapiTheaterShow).slug}` : `/movies/${(featured as StrapiMovie).slug}`;
  const eyebrow = isTheater ? "Καλοκαίρι · παραστάσεις που ταξιδεύουν" : "Καλοκαίρι · θερινά σινεμά & θέατρο που ταξιδεύει";
  const kicker = isTheater ? "Προτεινόμενη παράσταση" : "Προτεινόμενη ταινία";

  return (
    <section className="relative h-[75vh] min-h-[500px] overflow-hidden bg-[#111111]">
      <div className="absolute inset-0">
        {!isTheater && (featured as StrapiMovie).posterUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- hero poster Strapi, static export */}
            <img
              src={(featured as StrapiMovie).posterUrl}
              alt=""
              className="h-full w-full object-cover opacity-55"
            />
          </>
        ) : isTheater && (featured as StrapiTheaterShow).posterUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={(featured as StrapiTheaterShow).posterUrl}
              alt=""
              className="h-full w-full object-cover opacity-55"
            />
          </>
        ) : isTheater ? (
          <div
            className="h-full w-full opacity-40"
            style={{
              background: `linear-gradient(135deg, ${(featured as StrapiTheaterShow).gradientFrom}, ${(featured as StrapiTheaterShow).gradientTo})`,
            }}
          />
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
          <span className="mb-3 block font-body text-[10px] uppercase tracking-[0.28em] text-amber-200/90 md:text-[11px]">{eyebrow}</span>
          <span className="mb-2 inline-flex rounded border border-white/15 bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/95">
            Είδος · {featured.genre}
          </span>
          <span className="mb-2 block text-xs font-body uppercase tracking-[0.2em] text-white/55">{kicker}</span>
          <div className="w-16 h-0.5 bg-amber-400/85 mb-5" />
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4 leading-tight text-white">{featured.title}</h1>
          <p className="text-white/60 text-base md:text-lg mb-6 leading-relaxed max-w-lg font-body">{featured.synopsis}</p>
          <div className="flex items-center gap-4">
            <Link
              to={to}
              className="inline-flex items-center px-6 py-3 bg-white text-[#111111] text-sm font-semibold rounded hover:bg-white/90 transition-colors"
            >
              Δες λεπτομέρειες
            </Link>
            <span className="text-white/40 text-sm">{featured.duration}&apos;</span>
          </div>
          <p className="text-xs text-white/30 mt-6 font-body">
            Σκηνοθεσία: {featured.director} · {featured.cast?.slice(0, 3).join(", ")}
            {isTheater ? ` · ${(featured as StrapiTheaterShow).venue}` : ""}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
