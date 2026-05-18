import { motion } from "framer-motion";
import VenueCard from "@/components/VenueCard";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useVenues } from "@/hooks/useStrapi";

const Venues = () => {
  const { data: venues, isLoading } = useVenues();

  return (
    <div className="min-h-screen pt-36 pb-20 md:pb-8">
      <div className="section-black py-10 -mt-28 pt-36 mb-8">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">Χώροι</h1>
            <p className="text-white/50 text-sm">Σινεμά, θέατρα & μουσικές σκηνές</p>
          </motion.div>
        </div>
      </div>

      <div className="container">
        {isLoading ? (
          <LoadingState message="Φόρτωση χώρων..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(venues ?? []).map((venue, i) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="h-full [&>div]:max-w-none"
              >
                <VenueCard
                  venue={venue}
                  layout="grid"
                  variant="page"
                  moviesHref={`/movies?venue=${encodeURIComponent(venue.slug)}`}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Venues;
