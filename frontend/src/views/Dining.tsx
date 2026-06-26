import { useState, useMemo, type ReactNode } from "react";
import RestaurantCard from "@/components/RestaurantCard";
import PageListHeader, { PAGE_LIST_SHELL_CLASS, PAGE_LIST_SUBTITLE_CLASS, PAGE_LIST_TITLE_CLASS } from "@/components/PageListHeader";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useCuisines, useRestaurantCategories, useRestaurants } from "@/hooks/useStrapi";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";

const priceRanges = ["Όλα", "€€", "€€€", "€€€€"];

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded text-sm font-medium transition-all border ${
        active
          ? "bg-[#13143E] text-white border-[#13143E]"
          : "bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

const Dining = () => {
  usePageSeo(staticPageSeo.dining);

  const { data: restaurants, isLoading } = useRestaurants();
  const { data: cuisinesList } = useCuisines();
  const { data: categoriesList } = useRestaurantCategories();
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [cuisineSlug, setCuisineSlug] = useState<string | null>(null);
  const [price, setPrice] = useState("Όλα");
  const [showNewOnly, setShowNewOnly] = useState(false);

  const categoryFilters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of restaurants ?? []) {
      const slug = r.categorySlug?.trim();
      if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
    return (categoriesList ?? []).filter((c) => (counts.get(c.slug) ?? 0) > 0);
  }, [restaurants, categoriesList]);

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
    if (categorySlug) result = result.filter((r) => r.categorySlug === categorySlug);
    if (cuisineSlug) result = result.filter((r) => r.cuisineSlug === cuisineSlug);
    if (price !== "Όλα") result = result.filter((r) => r.priceRange === price);
    if (showNewOnly) result = result.filter((r) => r.isNew);
    return result;
  }, [restaurants, categorySlug, cuisineSlug, price, showNewOnly]);

  return (
    <div className={PAGE_LIST_SHELL_CLASS}>
      <PageListHeader>
        <h1 className={PAGE_LIST_TITLE_CLASS}>Φαγητό</h1>
        <p className={PAGE_LIST_SUBTITLE_CLASS}>Εστιατόρια & γαστρονομικές εμπειρίες</p>
      </PageListHeader>

      <div className="container">
        {categoryFilters.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground mr-1 uppercase tracking-wider">Κατηγορία:</span>
            <FilterChip active={categorySlug === null} onClick={() => setCategorySlug(null)}>
              Όλα
            </FilterChip>
            {categoryFilters.map((c) => (
              <FilterChip
                key={c.slug}
                active={categorySlug === c.slug}
                onClick={() => setCategorySlug(c.slug)}
              >
                {c.label}
              </FilterChip>
            ))}
          </div>
        ) : null}

        {cuisineFilters.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground mr-1 uppercase tracking-wider">Κουζίνα:</span>
            <FilterChip active={cuisineSlug === null} onClick={() => setCuisineSlug(null)}>
              Όλα
            </FilterChip>
            {cuisineFilters.map((c) => (
              <FilterChip
                key={c.slug}
                active={cuisineSlug === c.slug}
                onClick={() => setCuisineSlug(c.slug)}
              >
                {c.label}
              </FilterChip>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 mb-8">
          <span className="text-sm text-muted-foreground mr-1 uppercase tracking-wider">Τιμή:</span>
          {priceRanges.map((p) => (
            <FilterChip key={p} active={price === p} onClick={() => setPrice(p)}>
              {p}
            </FilterChip>
          ))}
          <FilterChip active={showNewOnly} onClick={() => setShowNewOnly(!showNewOnly)}>
            Νέα Μέρη
          </FilterChip>
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
