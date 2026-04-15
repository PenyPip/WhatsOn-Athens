import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useEditorialReviewBySlug } from "@/hooks/useStrapi";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";

const ReviewDetail = () => {
  const { slug } = useParams();
  const { data: review, isLoading } = useEditorialReviewBySlug(slug ?? "");

  if (isLoading) {
    return (
      <div className="min-h-screen pt-36">
        <LoadingState />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="min-h-screen pt-36 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl mb-2">Δεν βρέθηκε</h1>
          <Link to="/reviews" className="text-primary text-sm">Πίσω στις κριτικές</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {review.featuredImageGradientFrom && (
        <div className="h-[40vh] min-h-[300px] bg-[#111111] relative">
          <div
            className="absolute inset-0 opacity-50"
            style={{ background: `linear-gradient(135deg, ${review.featuredImageGradientFrom}, ${review.featuredImageGradientTo})` }}
          />
        </div>
      )}
      <div className="container max-w-2xl mt-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Link to="/reviews" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-3 h-3" /> Πίσω στις κριτικές
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {review.category === "movie" ? "Ταινία" : review.category === "theater" ? "Θέατρο" : "Φαγητό"}
            </span>
            {review.score && (
              <span className="text-sm font-bold">{review.score}/10</span>
            )}
          </div>

          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">{review.title}</h1>
          <p className="text-sm text-muted-foreground mb-8">
            για <span className="text-foreground font-medium">{review.contentTitle}</span> · {review.author} · {new Date(review.publishedAt).toLocaleDateString("el-GR", { day: "numeric", month: "long", year: "numeric" })}
          </p>

          <p className="text-foreground leading-relaxed text-lg">{review.body}</p>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

export default ReviewDetail;
