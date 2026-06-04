import { useState, useMemo } from "react";
import RestaurantCard from "@/components/RestaurantCard";
import PageHeaderReveal from "@/components/PageHeaderReveal";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useCuisines, useRestaurants } from "@/hooks/useStrapi";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";

const priceRanges = ["Όλα", "€€", "€€€", "€€€€"];

const Dining = () => {
  usePageSeo(staticPageSeo.dining);

  const { data: restaurants, isLoading } = useRestaurants();
  const { data: cuisinesList } = useCuisines();
  const [cuisineSlug, setCuisineSlug] = useState<string | null>(null);
  const [price, setPrice] = useState("Όλα");
  const [showNewOnly, setShowNewOnly] = useState(false);

  const cuisineFilters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of restaurants ?? []) {
      const slug = r.cuisineSlug?.trim();
      if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
    return (cuisinesList ?? []).filter((c) => (counts.get(c.slug) ?? 0) > 0);
  }, [restaurants, cuisinesList]);

  const filtered = useMemo(() => {
    if (!restaurants) return [];
    let result = restaurants;
    if (cuisineSlug) result = result.filter((r) => r.cuisineSlug === cuisineSlug);
    if (price !== "Όλα") result = result.filter((r) => r.priceRange === price);
    if (showNewOnly) result = result.filter((r) => r.isNew);
    return result;
  }, [restaurants, cuisineSlug, price, showNewOnly]);

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="section-black mb-6 max-md:-mt-16 max-md:py-5 max-md:pt-20 md:-mt-28 md:mb-8 md:py-10 md:pt-36">
        <div className="container">
          <PageHeaderReveal>
            <h1 className="font-display text-2xl font-bold text-white mb-1 md:mb-2 md:text-4xl">Φαγητό</h1>
            <p className="text-sm text-white/60 md:text-base">Εστιατόρια & γαστρονομικές εμπειρίες</p>
          </PageHeaderReveal>
        </div>
      </div>

      <div className="container">
        {cuisineFilters.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground mr-1 uppercase tracking-wider">Κουζίνα:</span>
            <button
              type="button"
              onClick={() => setCuisineSlug(null)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-all border ${
                cuisineSlug === null
                  ? "bg-[#13143E] text-white border-[#13143E]"
                  : "bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground"
              }`}
            >
              Όλα
            </button>
            {cuisineFilters.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setCuisineSlug(c.slug)}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-all border ${
                  cuisineSlug === c.slug
                    ? "bg-[#13143E] text-white border-[#13143E]"
                    : "bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 mb-8">
          <span className="text-sm text-muted-foreground mr-1 uppercase tracking-wider">Τιμή:</span>
          {priceRanges.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPrice(p)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-all border ${
                price === p ? "bg-[#13143E] text-white border-[#13143E]" : "bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowNewOnly(!showNewOnly)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all border ml-2 ${
              showNewOnly ? "bg-[#13143E] text-white border-[#13143E]" : "bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground"
            }`}
          >
            Νέα Μέρη
          </button>
        </div>

        {isLoading ? (
          <LoadingState message="Φόρτωση εστιατορίων..." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((r, i) => (
              <RestaurantCard key={r.id} restaurant={r} index={i} />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-base">
            <p>Δεν βρέθηκαν εστιατόρια για αυτά τα φίλτρα.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Dining;
