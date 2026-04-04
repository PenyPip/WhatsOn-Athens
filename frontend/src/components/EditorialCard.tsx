import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { EditorialReview } from "@/data/mockData";
import type { StrapiEditorialReview } from "@/lib/api";

const categoryLabels: Record<string, string> = {
  movie: "Ταινία",
  theater: "Θέατρο",
  restaurant: "Φαγητό",
};

const EditorialCard = ({ review, index = 0 }: { review: EditorialReview | StrapiEditorialReview; index?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link to={`/reviews/${review.slug}`} className="group block card-elevated overflow-hidden">
        {review.featuredImageGradientFrom && (
          <div
            className="h-44"
            style={{ background: `linear-gradient(135deg, ${review.featuredImageGradientFrom}, ${review.featuredImageGradientTo})` }}
          />
        )}
        <div className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {categoryLabels[review.category] || review.category}
            </span>
            {review.score && (
              <span className="text-[11px] font-bold text-foreground">{review.score}/10</span>
            )}
          </div>
          <h3 className="font-display text-lg font-semibold mb-2 group-hover:text-primary transition-colors leading-snug">{review.title}</h3>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{review.body}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-foreground/5 pt-3">
            <span>{review.contentTitle}</span>
            <span className="font-medium text-foreground">{review.author}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default EditorialCard;
