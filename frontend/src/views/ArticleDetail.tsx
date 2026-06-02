import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";
import LoadingState from "@/components/LoadingState";
import { useArticleBySlug } from "@/hooks/useStrapi";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";
import { truncateDescription } from "@/lib/siteMetadata";

const articleTypeLabels: Record<string, string> = {
  kritiki_parastasis: "Κριτική θεάτρου",
  kritiki_tainias: "Κριτική ταινίας",
  sigkrisi: "Σύγκριση",
  giati_na_deis: "Γιατί να δεις",
  politistiko_keimeno: "Πολιτιστικό",
};

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

  const publishedLabel = (() => {
    const d = new Date(article.publishedAt);
    if (!Number.isFinite(d.getTime())) return "Χωρίς ημερομηνία";
    return d.toLocaleDateString("el-GR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  })();

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="container max-w-3xl pt-36">
        <div className="animate-fade-in-up">
          <Link
            to="/articles"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-3 h-3" /> Πίσω στα άρθρα
          </Link>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {articleTypeLabels[article.articleType] ?? "Άρθρο"}
            </span>
            <span className="text-xs text-muted-foreground">
              {publishedLabel}
            </span>
          </div>

          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">{article.title}</h1>

          {article.metaDescription ? (
            <p className="text-base text-muted-foreground leading-relaxed mb-8">{article.metaDescription}</p>
          ) : null}

          <article className="prose prose-sm md:prose-base max-w-none prose-headings:font-display prose-p:leading-relaxed">
            {article.content.split("\n").map((line, idx) => (
              <p key={`${idx}-${line.slice(0, 12)}`}>{line}</p>
            ))}
          </article>

          {article.relatedEvent?.name ? (
            <div className="mt-10 rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">Σχετικό event</p>
              <p className="text-sm font-semibold text-foreground">{article.relatedEvent.name}</p>
            </div>
          ) : null}
        </div>
      </div>
      <Footer />
    </div>
  );
}
