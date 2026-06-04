import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import ArticleDetailTemplate from "@/components/ArticleDetailTemplate";
import LoadingState from "@/components/LoadingState";
import { useArticleBySlug } from "@/hooks/useStrapi";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";
import { articleContentToHtml } from "@/lib/articleContent";
import { truncateDescription } from "@/lib/siteMetadata";

export default function ArticleDetail() {
  const { slug } = useParams();
  const { data: article, isLoading } = useArticleBySlug(slug ?? "");

  usePageSeo(
    useMemo(() => {
      if (isLoading) return { title: "Άρθρο", enabled: false };
      if (!article) return { ...staticPageSeo.notFound, path: slug ? `/articles/${slug}` : "/articles" };
      return {
        title: article.title,
        description: truncateDescription(article.metaDescription || article.content || "Άρθρο από το 37Ν."),
        path: `/articles/${article.slug}`,
      };
    }, [isLoading, article, slug]),
  );

  const contentHtml = useMemo(
    () => (article ? articleContentToHtml(article.content) : ""),
    [article],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen pt-36">
        <LoadingState />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen pt-36 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl mb-2">Δεν βρέθηκε άρθρο</h1>
          <Link to="/articles" className="text-primary text-sm">
            Πίσω στα άρθρα
          </Link>
        </div>
      </div>
    );
  }

  return <ArticleDetailTemplate article={article} contentHtml={contentHtml} />;
}
