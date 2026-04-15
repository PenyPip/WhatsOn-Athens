import Hero from "@/components/Hero";
import HorizontalScroll from "@/components/HorizontalScroll";
import EventCard from "@/components/EventCard";
import RestaurantCard from "@/components/RestaurantCard";
import EditorialCard from "@/components/EditorialCard";
import LoadingState from "@/components/LoadingState";
import { motion } from "framer-motion";
import { useMovies, useTheaterShows, useRestaurants, useEditorialReviews } from "@/hooks/useStrapi";

const Index = () => {
  const { data: movies, isLoading: moviesLoading } = useMovies();
  const { data: theaterShows, isLoading: theaterLoading } = useTheaterShows();
  const { data: restaurants, isLoading: restaurantsLoading } = useRestaurants();
  const { data: editorialReviews, isLoading: reviewsLoading } = useEditorialReviews();

  const newRestaurants = restaurants?.filter((r) => r.isNew) ?? [];

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Hero />

      <div className="section-black py-3">
        <div className="container flex items-center gap-8 overflow-x-auto scrollbar-hide text-xs font-body uppercase tracking-[0.15em]">
          <span className="text-white/40 flex-shrink-0">Trending:</span>
          {["Poor Things", "Μήδεια", "Nolan", "Dune", "Mamma Mia!"].map((t) => (
            <span key={t} className="text-white/70 hover:text-white cursor-pointer transition-colors flex-shrink-0">{t}</span>
          ))}
        </div>
      </div>

      {moviesLoading ? (
        <LoadingState message="Φόρτωση ταινιών..." />
      ) : (
        <HorizontalScroll title="Τώρα στις Οθόνες" subtitle="Στα σινεμά σε όλη την Ελλάδα">
          {(movies ?? []).map((movie, i) => (
            <div key={movie.id} className="min-w-[170px] max-w-[170px] md:min-w-[200px] md:max-w-[200px] flex-shrink-0">
              <EventCard
                slug={movie.slug} title={movie.title} subtitle={movie.director}
                genre={movie.genre} duration={movie.duration} score={movie.criticScore}
                gradientFrom={movie.gradientFrom} gradientTo={movie.gradientTo}
                posterUrl={movie.posterUrl}
                type="movie" index={i}
              />
            </div>
          ))}
        </HorizontalScroll>
      )}

      <div className="section-black py-12">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 block mb-2">Αυτή την εβδομάδα</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">Στη Σκηνή</h2>
            <p className="text-white/50 text-sm mb-8">Θέατρο, χορός & μουσική στην Αθήνα</p>
          </motion.div>
          {theaterLoading ? (
            <LoadingState message="Φόρτωση παραστάσεων..." />
          ) : (
            <div className="flex items-start gap-4 overflow-x-auto scrollbar-hide pb-2">
              {(theaterShows ?? []).map((show, i) => (
                <div key={show.id} className="min-w-[170px] max-w-[170px] md:min-w-[200px] md:max-w-[200px] flex-shrink-0">
                  <EventCard
                    slug={show.slug} title={show.title} subtitle={show.director}
                    genre={show.genre} duration={show.duration}
                    gradientFrom={show.gradientFrom} gradientTo={show.gradientTo}
                    posterUrl={show.posterUrl}
                    type="theater" index={i}
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
        <HorizontalScroll title="Νέα Μέρη" subtitle="Εστιατόρια που άνοιξαν πρόσφατα">
          {newRestaurants.map((r, i) => (
            <div key={r.id} className="min-w-[220px] max-w-[220px] md:min-w-[260px] md:max-w-[260px] flex-shrink-0">
              <RestaurantCard restaurant={r} index={i} />
            </div>
          ))}
        </HorizontalScroll>
      )}

      <div className="section-black py-10">
        <div className="container text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="font-display text-xl font-bold text-white mb-2">Μάθε τι παίζει κάθε εβδομάδα.</h3>
            <p className="text-white/50 text-sm mb-5">Γράψου στο newsletter μας.</p>
            <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Email"
                className="flex-1 px-4 py-2.5 rounded bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/40"
              />
              <button className="px-5 py-2.5 bg-white text-[#111111] text-sm font-semibold rounded hover:bg-white/90 transition-colors">
                Εγγραφή
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <section className="py-12">
        <div className="container">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-1">Από τη συντακτική ομάδα</span>
              <h2 className="font-display text-2xl font-bold text-foreground">Κριτικές Συντακτών</h2>
            </div>
            <a href="/reviews" className="text-sm text-foreground font-medium hover:text-primary transition-colors">
              Όλες →
            </a>
          </div>
          {reviewsLoading ? (
            <LoadingState message="Φόρτωση κριτικών..." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(editorialReviews ?? []).slice(0, 3).map((review, i) => (
                <EditorialCard key={review.id} review={review} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

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
                <a href="/movies" className="block text-white/60 hover:text-white transition-colors">Ταινίες</a>
                <a href="/theater" className="block text-white/60 hover:text-white transition-colors">Θέατρο</a>
                <a href="/dining" className="block text-white/60 hover:text-white transition-colors">Φαγητό</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.15em] text-white/50 mb-3">Περιεχόμενο</h4>
              <div className="space-y-2 text-sm">
                <a href="/reviews" className="block text-white/60 hover:text-white transition-colors">Κριτικές</a>
                <a href="/venues" className="block text-white/60 hover:text-white transition-colors">Χώροι</a>
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