import { Link } from "react-router-dom";
import { articleTypeLabels, formatArticleDate } from "@/lib/articleLabels";
import type { StrapiArticle } from "@/lib/api";
import { cn } from "@/lib/utils";

type RelatedArticlesSectionProps = {
  articles: StrapiArticle[];
  /** Προεπιλογή: «Σχετικά άρθρα» */
  title?: string;
  className?: string;
};

export default function RelatedArticlesSection({
  articles,
  title = "Σχετικά άρθρα",
  className,
}: RelatedArticlesSectionProps) {
  if (!articles.length) return null;

  return (
    <section className={cn("", className)}>
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      <ul className="mt-4 grid list-none gap-4 sm:grid-cols-2" aria-label={title}>
        {articles.map((article, i) => (
          <li
            key={`${article.id}-${article.slug}`}
            className="animate-stagger-in"
            style={{ ["--stagger" as string]: Math.min(i, 6) }}
          >
            <Link
              to={`/articles/${article.slug}`}
              className="group flex h-full flex-col rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-[#13143E]/25 hover:bg-muted/30"
            >
              {article.featuredImageUrl ? (
                <img
                  src={article.featuredImageUrl}
                  alt={article.featuredImageAlt || article.title}
                  className="mb-3 h-32 w-full rounded-lg object-cover"
                  loading="lazy"
                />
              ) : null}
              <p className="font-article-ui text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {articleTypeLabels[article.articleType] ?? "Άρθρο"}
              </p>
              <h3 className="mt-1.5 font-article text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-[#7C2B76]">
                {article.title}
              </h3>
              {article.metaDescription ? (
                <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {article.metaDescription}
                </p>
              ) : null}
              <p className="mt-3 text-xs text-muted-foreground">{formatArticleDate(article.publishedAt)}</p>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4">
        <Link
          to="/articles"
          className="text-sm font-semibold text-[#13143E] underline underline-offset-4 transition-colors hover:text-[#7C2B76]"
        >
          Όλα τα άρθρα
        </Link>
      </p>
    </section>
  );
}
