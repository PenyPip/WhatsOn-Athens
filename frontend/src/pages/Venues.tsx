import { motion } from "framer-motion";
import { MapPin, Users } from "lucide-react";
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
                className="card-elevated p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-display text-lg font-semibold">{venue.name}</h3>
                  <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider rounded bg-[#111111] text-white font-medium">{venue.type}</span>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 flex-shrink-0" /> {venue.address}</p>
                  <p className="flex items-center gap-2"><Users className="w-3.5 h-3.5" /> {venue.seatsTotal} θέσεις</p>
                  <p className="text-xs font-medium text-foreground">{venue.city}</p>
                </div>
                <div className="mt-4 h-32 rounded bg-secondary flex items-center justify-center border border-border">
                  <span className="text-xs text-muted-foreground">Χάρτης</span>
                </div>
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
