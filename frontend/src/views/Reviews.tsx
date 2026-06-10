import { useState, useMemo } from "react";
import EditorialCard from "@/components/EditorialCard";
import PageListHeader, { PAGE_LIST_SHELL_CLASS, PAGE_LIST_SUBTITLE_CLASS, PAGE_LIST_TITLE_CLASS } from "@/components/PageListHeader";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useEditorialReviews } from "@/hooks/useStrapi";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";

const categories = ["Όλα", "Ταινία", "Θέατρο", "Φαγητό"];
const categoryMap: Record<string, string> = { "Ταινία": "movie", "Θέατρο": "theater", "Φαγητό": "restaurant" };

const Reviews = () => {
  usePageSeo(staticPageSeo.reviews);

  const { data: editorialReviews, isLoading } = useEditorialReviews();
  const [category, setCategory] = useState("Όλα");

  const filtered = useMemo(() => {
    if (!editorialReviews) return [];
    if (category === "Όλα") return editorialReviews;
    return editorialReviews.filter((r) => r.category === categoryMap[category]);
  }, [editorialReviews, category]);

  return (
    <div className={PAGE_LIST_SHELL_CLASS}>
      <PageListHeader>
        <h1 className={PAGE_LIST_TITLE_CLASS}>Κριτικές</h1>
        <p className={PAGE_LIST_SUBTITLE_CLASS}>Κριτικές από τη συντακτική ομάδα</p>
      </PageListHeader>

      <div className="container">
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-all border ${
                category === c ? "bg-[#13143E] text-white border-[#13143E]" : "bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingState message="Φόρτωση κριτικών..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((review, i) => (
              <EditorialCard key={review.id} review={review} index={i} />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-base">
            <p>Δεν βρέθηκαν κριτικές για αυτή την κατηγορία.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Reviews;