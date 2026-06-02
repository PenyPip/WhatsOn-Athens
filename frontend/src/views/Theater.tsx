import { useMemo } from "react";
import EventCard from "@/components/EventCard";
import PageHeaderReveal from "@/components/PageHeaderReveal";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useTheaterShows } from "@/hooks/useStrapi";
import { theaterGenreLabel } from "@/lib/theaterGenre";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";

const TheaterPage = () => {
  usePageSeo(staticPageSeo.theater);

  const { data: theaterShows, isLoading } = useTheaterShows();
  const allShows = useMemo(() => theaterShows ?? [], [theaterShows]);
  const hasShows = allShows.length > 0;

  return (
    <div className="min-h-screen pt-36 pb-20 md:pb-8">
      <div className="section-black py-10 -mt-28 pt-36 mb-8">
        <div className="container">
          <PageHeaderReveal>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">Θέατρο</h1>
            <p className="text-white/60 text-base">Στη σκηνή σε Αθήνα & Θεσσαλονίκη</p>
          </PageHeaderReveal>
        </div>
      </div>

      <div className="container">
        {isLoading ? (
          <LoadingState message="Φόρτωση παραστάσεων..." />
        ) : !hasShows ? (
          <p className="text-sm text-muted-foreground">
            Δεν υπάρχουν παραστάσεις προς το παρόν. Πρόσθεσέ τες στο CMS (Theater Show).
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {allShows.map((show, i) => (
                <EventCard
                  key={show.id}
                  slug={show.slug}
                  title={show.title}
                  subtitle={show.director}
                  genre={theaterGenreLabel(show.genre)}
                  duration={show.duration}
                  posterUrl={show.posterUrl}
                  type="theater"
                  index={i}
                  badge={show.isPremiere ? "Πρεμιέρα" : show.isLastShows ? "Τελευταίες" : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default TheaterPage;
