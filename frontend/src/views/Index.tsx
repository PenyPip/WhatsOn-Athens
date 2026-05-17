import Hero from "@/components/Hero";
import HorizontalScroll from "@/components/HorizontalScroll";
import EventCard from "@/components/EventCard";
import RestaurantCard from "@/components/RestaurantCard";
import LoadingState from "@/components/LoadingState";
import { motion } from "framer-motion";
import { useMovies, useTheaterShows, useRestaurants } from "@/hooks/useStrapi";

const Index = () => {
  const { data: movies, isLoading: moviesLoading } = useMovies();
  const { data: theaterShows, isLoading: theaterLoading } = useTheaterShows();
  const { data: restaurants, isLoading: restaurantsLoading } = useRestaurants();

  const newRestaurants = restaurants?.filter((r) => r.isNew) ?? [];

  const summerStrip = ["Θερινό σινεμά", "Περιοδείες ανά την Ελλάδα", "Ανοιχτός ουρανός", "Θέατρο καλοκαιριού", "Ξανά στη σκηνή"];

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Hero />

      <div className="section-black py-3">
        <div className="container flex items-center gap-8 overflow-x-auto scrollbar-hide text-xs font-body uppercase tracking-[0.15em]">
          <span className="text-amber-200/85 flex-shrink-0">Καλοκαίρι:</span>
          {summerStrip.map((t) => (
            <span key={t} className="text-white/70 hover:text-white cursor-pointer transition-colors flex-shrink-0">
              {t}
            </span>
          ))}
        </div>
      </div>

      {moviesLoading ? (
        <LoadingState message="Φόρτωση ταινιών..." />
      ) : (
        <HorizontalScroll
          spotlight
          eyebrow="Καλοκαίρι · ανοιχτός ουρανός"
          title="Θερινά σινεμά"
          subtitle="Προτάσεις από την τρέχουσα διανομή—ιδανικά για ζεστές νύχτες κάτω από τ' αστέρια ή όπου υπάρχει ανοιχτή οθόνη."
        >
          {(movies ?? []).map((movie, i) => (
            <div key={movie.id} className="min-w-[170px] max-w-[170px] md:min-w-[200px] md:max-w-[200px] flex-shrink-0">
              <EventCard
                slug={movie.slug}
                title={movie.title}
                subtitle={movie.director}
                genre={movie.genre}
                duration={movie.duration}
                score={movie.criticScore}
                gradientFrom={movie.gradientFrom}
                gradientTo={movie.gradientTo}
                posterUrl={movie.posterUrl}
                type="movie"
                index={i}
              />
            </div>
          ))}
        </HorizontalScroll>
      )}

      <div className="section-black relative overflow-hidden py-14 md:py-20">
        <div aria-hidden className="pointer-events-none absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-amber-500/10 blur-[90px]" />
        <div className="container relative z-[1]">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <span className="mb-2 block font-body text-[10px] uppercase tracking-[0.24em] text-amber-200/85">Σεζόν & περιοδική κίνηση</span>
            <h2 className="font-display text-3xl font-bold leading-tight text-white md:text-5xl md:leading-[1.1]">
              Καλοκαιρινές περιοδείες & παραστάσεις που ταξιδεύουν
            </h2>
            <p className="mt-4 max-w-2xl text-base text-white/55 md:text-lg">
              Από σταθερές σεζόν στα μεγάλα θέατρα μέχρι περιοδείες και φεστιβαλικές εμφανίσεις ανά την Ελλάδα.
            </p>
          </motion.div>
          {theaterLoading ? (
            <LoadingState message="Φόρτωση παραστάσεων..." />
          ) : (
            <div className="mt-10 flex items-start gap-4 overflow-x-auto scrollbar-hide pb-2">
              {(theaterShows ?? []).map((show, i) => (
                <div key={show.id} className="min-w-[170px] max-w-[170px] md:min-w-[200px] md:max-w-[200px] flex-shrink-0">
                  <EventCard
                    slug={show.slug}
                    title={show.title}
                    subtitle={show.director}
                    genre={show.genre}
                    duration={show.duration}
                    gradientFrom={show.gradientFrom}
                    gradientTo={show.gradientTo}
                    posterUrl={show.posterUrl}
                    type="theater"
                    index={i}
                    badge={show.isPremiere ? "Πρεμιέρα" : show.isLastShows ? "Τελευταίες" : undefined}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {restaurantsLoading ? (
        <LoadingState message="Φόρτωση εστιατορίων..." />
      ) : (
        <HorizontalScroll
          muted
          eyebrow="Περιεχόμενο"
          title="Φαγητό & μέρη στην πόλη"
          subtitle="Μερικές ιδέες μέχρι να εμπλουτιστεί η ενότητα—χωρίς έμφαση σεζόν."
        >
          {newRestaurants.map((r, i) => (
            <div key={r.id} className="min-w-[220px] max-w-[220px] md:min-w-[260px] md:max-w-[260px] flex-shrink-0">
              <RestaurantCard restaurant={r} index={i} />
            </div>
          ))}
        </HorizontalScroll>
      )}

      <div className="section-black py-10">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <h3 className="font-display text-xl font-bold text-white mb-2">Μάθε τι παίζει κάθε εβδομάδα.</h3>
            <p className="text-white/50 text-sm mb-5">Γράψου στο newsletter μας.</p>
            <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Email"
                className="flex-1 px-4 py-2.5 rounded bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/40"
              />
              <button type="button" className="px-5 py-2.5 bg-white text-[#111111] text-sm font-semibold rounded hover:bg-white/90 transition-colors">
                Εγγραφή
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <footer className="section-black py-12 border-t border-white/10">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-baseline gap-0.5">
                  <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 300, fontSize: '1.6rem', color: '#F0EDF8', letterSpacing: '-2px', lineHeight: 1 }}>37</span>
                  <sup style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontWeight: 300, fontSize: '0.8rem', color: 'rgba(240,237,248,0.6)', verticalAlign: 'super' }}>°N</sup>
                </div>
                <div className="flex flex-col gap-0.5" style={{ borderLeft: '1px solid rgba(240,237,248,0.15)', paddingLeft: '10px' }}>
                  <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.45rem', color: '#F0EDF8', letterSpacing: '2px' }}>ATHENS GUIDE</span>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 300, fontSize: '0.42rem', color: 'rgba(240,237,248,0.45)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Cinema · Events · Culture</span>
                </div>
              </div>
              <p className="text-white/40 text-xs mt-2 leading-relaxed">Ο οδηγός σου για ψυχαγωγία και γαστρονομία στην Αθήνα.</p>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.15em] text-white/50 mb-3">Εξερεύνηση</h4>
              <div className="space-y-2 text-sm">
                <a href="/movies" className="block text-white/60 hover:text-white transition-colors">
                  Ταινίες
                </a>
                <a href="/theater" className="block text-white/60 hover:text-white transition-colors">
                  Θέατρο
                </a>
                <a href="/dining" className="block text-white/60 hover:text-white transition-colors">
                  Φαγητό
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.15em] text-white/50 mb-3">Περιεχόμενο</h4>
              <div className="space-y-2 text-sm">
                <a href="/venues" className="block text-white/60 hover:text-white transition-colors">
                  Χώροι
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.15em] text-white/50 mb-3">Social</h4>
              <div className="space-y-2 text-sm">
                <span className="block text-white/60">Instagram</span>
                <span className="block text-white/60">Facebook</span>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-center">
            <p className="text-xs text-white/30">© 2025 37°N Athens. Με ❤️ από την Αθήνα.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
