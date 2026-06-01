import { useState, useMemo } from "react";
import EventCard from "@/components/EventCard";
import PageHeaderReveal from "@/components/PageHeaderReveal";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useTheaterShows } from "@/hooks/useStrapi";
import { filterResidentTheaterShows } from "@/lib/theaterTours";
import {
  THEATER_GENRE_FILTER_OPTIONS,
  theaterGenreLabel,
  type TheaterGenreFilter,
} from "@/lib/theaterGenre";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";

const TheaterPage = () => {
  usePageSeo(staticPageSeo.theater);

  const { data: theaterShows, isLoading } = useTheaterShows();
  const [genreFilter, setGenreFilter] = useState<TheaterGenreFilter>("all");

  const residentShows = useMemo(
    () => filterResidentTheaterShows(theaterShows ?? []),
    [theaterShows],
  );
  const hasShows = residentShows.length > 0;

  const filtered = useMemo(() => {
    if (genreFilter === "all") return residentShows;
    return residentShows.filter((s) => s.genre === genreFilter);
  }, [residentShows, genreFilter]);

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
            <div className="mb-8 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm uppercase tracking-wider text-muted-foreground">Είδος:</span>
              {THEATER_GENRE_FILTER_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGenreFilter(value)}
                  className={`rounded border px-4 py-1.5 text-sm font-medium transition-all ${
                    genreFilter === value
                      ? "border-[#13143E] bg-[#13143E] text-white"
                      : "border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Δεν βρέθηκαν παραστάσεις για αυτό το είδος.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filtered.map((show, i) => (
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
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default TheaterPage;
