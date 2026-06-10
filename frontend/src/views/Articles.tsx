import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import PageListHeader, { PAGE_LIST_SHELL_CLASS, PAGE_LIST_SUBTITLE_CLASS, PAGE_LIST_TITLE_CLASS } from "@/components/PageListHeader";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useArticles } from "@/hooks/useStrapi";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";

import ArticleTags from "@/components/ArticleTags";
import { resolveArticleRelatedListLabel } from "@/lib/articleRelated";
import { articleTypeLabels, formatArticleDate } from "@/lib/articleLabels";
import { ARTICLE_PAGE_CLASS } from "@/lib/articleTypography";

const articleTypes = [
  "all",
  "kritiki_parastasis",
  "kritiki_tainias",
  "sigkrisi",
  "giati_na_deis",
  "politistiko_keimeno",
] as const;

type ArticleFilterType = (typeof articleTypes)[number];

export default function Articles() {
  usePageSeo(staticPageSeo.articles);
  const { data: articles, isLoading } = useArticles(true, 100);
  const [filter, setFilter] = useState<ArticleFilterType>("all");

  const filtered = useMemo(() => {
    const all = articles ?? [];
    if (filter === "all") return all;
    return all.filter((a) => a.articleType === filter);
  }, [articles, filter]);

  return (
    <div className={PAGE_LIST_SHELL_CLASS}>
      <PageListHeader>
        <h1 className={PAGE_LIST_TITLE_CLASS}>Άρθρα</h1>
        <p className={PAGE_LIST_SUBTITLE_CLASS}>Όλα τα άρθρα, συγκρίσεις και πολιτιστικό περιεχόμενο.</p>
      </PageListHeader>

      <div className={cn("container", ARTICLE_PAGE_CLASS)}>
        <div className="font-article-ui mb-8 flex flex-wrap items-center gap-2">
          {articleTypes.map((type) => {
            const active = filter === type;
            const label = type === "all" ? "Όλα" : articleTypeLabels[type];
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-all border ${
                  active
                    ? "bg-[#13143E] text-white border-[#13143E]"
                    : "bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <LoadingState message="Φόρτωση άρθρων..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((article, i) => {
              const relatedLabel = resolveArticleRelatedListLabel(article);
              return (
              <article
                key={`${article.id}-${article.slug}`}
                className="animate-stagger-in card-elevated overflow-hidden"
                style={{ ["--stagger" as string]: Math.min(i, 8) }}
              >
                <Link to={`/articles/${article.slug}`} className="group block p-5">
                  {article.featuredImageUrl ? (
                    <img
                      src={article.featuredImageUrl}
                      alt={article.featuredImageAlt || article.title}
                      className="mb-4 h-44 w-full rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <span className="font-article-ui text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    {articleTypeLabels[article.articleType] ?? "Άρθρο"}
                  </span>
                  <h2 className="mt-2 text-left font-article text-xl font-semibold leading-snug group-hover:text-primary transition-colors">
                    {article.title}
                  </h2>
                  {article.metaDescription ? (
                    <p className="font-article mt-3 text-left text-sm leading-relaxed text-muted-foreground line-clamp-3">
                      {article.metaDescription}
                    </p>
                  ) : null}
                  {article.tags.length > 0 ? (
                    <ArticleTags tags={article.tags.slice(0, 4)} className="mt-4" showLabel={false} />
                  ) : null}
                  <div className="mt-4 border-t border-foreground/5 pt-3 text-xs text-muted-foreground flex items-center justify-between">
                    <span>
                      {formatArticleDate(article.publishedAt)}
                    </span>
                    {relatedLabel ? (
                      <span className="text-foreground/80">Σχετικό: {relatedLabel}</span>
                    ) : null}
                  </div>
                </Link>
              </article>
            );
            })}
          </div>
        )}

        {!isLoading && filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-base">
            <p>Δεν βρέθηκαν άρθρα σε αυτή την κατηγορία.</p>
          </div>
        ) : null}
      </div>

      <Footer />
    </div>
  );
}
