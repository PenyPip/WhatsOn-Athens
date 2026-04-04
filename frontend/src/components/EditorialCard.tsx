import { Star } from "lucide-react";
import { Review } from "@/lib/strapi";

const EditorialCard = ({ review }: { review: Review }) => {
  const eventTitle = review.movie?.title || review.theater_show?.title || "";

  return (
    <div className="glass-card rounded-lg p-5 glass-card-hover transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${review.is_editorial ? "bg-primary/20 text-primary" : "bg-secondary text-secondary-foreground"}`}>
          {review.is_editorial ? "Editorial" : "User Review"}
        </span>
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-primary fill-primary" />
          <span className="text-sm font-bold text-primary">{review.score}</span>
        </div>
      </div>
      <h3 className="font-display font-semibold text-sm leading-tight mb-2">{review.title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-3">{review.body}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{review.author}</span>
        {eventTitle && <span className="text-xs text-primary truncate max-w-[120px]">{eventTitle}</span>}
      </div>
    </div>
  );
};

export default EditorialCard;
