import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ArticleTags from "@/components/ArticleTags";
import Footer from "@/components/Footer";
import {
  articleTypeLabelUppercase,
  articleTypeLabels,
  estimateReadingMinutes,
  formatArticleDateUppercase,
} from "@/lib/articleLabels";
import type { StrapiArticle } from "@/lib/api";
import { cn } from "@/lib/utils";

type ArticleDetailTemplateProps = {
  article: StrapiArticle;
  contentHtml: string;
};

function MetaDot() {
  return (
    <span className="mx-2 text-[#1C1D62]/35" aria-hidden>
      ·
    </span>
  );
}

export default function ArticleDetailTemplate({ article, contentHtml }: ArticleDetailTemplateProps) {
  const typeLabel = articleTypeLabels[article.articleType] ?? "Άρθρο";
  const typeUpper = articleTypeLabelUppercase(article.articleType);
  const dateUpper = formatArticleDateUppercase(article.publishedAt);
  const readingMin = estimateReadingMinutes(contentHtml || article.content);
  const hasDeck = Boolean(article.metaDescription?.trim());
  const hasRelated = Boolean(article.relatedEvent?.name?.trim());
  const hasTags = article.tags.length > 0;
  const hasImage = Boolean(article.featuredImageUrl);
  const kickerTag = article.tags[0]?.trim();
  const kickerLine = kickerTag
    ? `${typeUpper} · ${kickerTag.toLocaleUpperCase("el-GR")}`
    : typeUpper;

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      <div className="container max-w-3xl px-4 pt-32 pb-16 md:px-6 md:pt-36 md:pb-24">
        <div className="animate-fade-in-up">
          <Link
            to="/articles"
            className="mb-10 inline-flex items-center gap-1.5 font-body text-xs font-medium text-[#1C1D62]/55 transition-colors hover:text-[#7C2B76]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Πίσω στα άρθρα
          </Link>

          {/* Kicker — γραμμή + κατηγορία (όπως στο reference, με magenta 37Ν) */}
          <div className="flex items-center gap-3">
            <span className="h-px w-10 shrink-0 bg-[#7C2B76]" aria-hidden />
            <p className="font-body text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7C2B76]">
              {kickerLine}
            </p>
          </div>

          <h1 className="mt-6 font-display text-[2rem] font-bold leading-[1.12] tracking-tight text-[#13143E] md:text-[2.75rem] md:leading-[1.1] lg:text-[3rem]">
            {article.title}
          </h1>

          <p className="mt-5 font-body text-[11px] font-medium uppercase tracking-[0.14em] text-[#1C1D62]/50">
            {dateUpper}
            <MetaDot />
            {typeUpper}
            <MetaDot />
            <span>Ανάγνωση ~{readingMin} λεπτά</span>
          </p>

          <hr className="mt-8 border-0 border-t-2 border-[#13143E]" />

          {hasDeck ? (
            <p className="mt-8 font-display text-xl font-medium leading-snug text-[#13143E]/90 md:text-2xl md:leading-snug">
              {article.metaDescription}
            </p>
          ) : null}

          {hasImage ? (
            <figure className={cn("overflow-hidden", hasDeck ? "mt-8" : "mt-8")}>
              <div className="aspect-[2/1] max-h-[11.5rem] w-full sm:max-h-[12.5rem] md:max-h-[13.5rem]">
                <img
                  src={article.featuredImageUrl}
                  alt={article.featuredImageAlt || article.title}
                  className="h-full w-full object-cover object-center"
                  loading="eager"
                />
              </div>
              {article.featuredImageAlt ? (
                <figcaption className="mt-1.5 font-body text-[11px] text-[#1C1D62]/45">
                  {article.featuredImageAlt}
                </figcaption>
              ) : null}
            </figure>
          ) : null}

          <div className="mt-8">
            {contentHtml ? (
              <article
                className="article-detail-prose"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            ) : (
              <p className="font-body text-sm italic text-[#1C1D62]/50">Δεν υπάρχει κείμενο για αυτό το άρθρο.</p>
            )}
          </div>

          {hasTags ? (
            <ArticleTags
              tags={article.tags}
              className="mt-12 border-t border-[#1C1D62]/10 pt-8"
              variant="editorial"
            />
          ) : null}

          {hasRelated ? (
            <aside className="mt-12 rounded-lg border border-[#1C1D62]/10 bg-[#F0EDF8]/50 px-5 py-5 md:px-6">
              <p className="font-body text-[10px] font-bold uppercase tracking-[0.18em] text-[#7C2B76]">
                Σχετική εκδήλωση
              </p>
              <p className="mt-2 font-display text-lg font-semibold text-[#13143E]">{article.relatedEvent!.name}</p>
            </aside>
          ) : null}

          <footer className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-[#1C1D62]/10 pt-8">
            <Link
              to="/articles"
              className="inline-flex items-center gap-1.5 font-body text-sm font-semibold text-[#7C2B76] transition-colors hover:text-[#13143E]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Όλα τα άρθρα
            </Link>
            <p className="font-body text-[11px] uppercase tracking-[0.1em] text-[#1C1D62]/45">
              {typeLabel}
            </p>
          </footer>
        </div>
      </div>

      <Footer />
    </div>
  );
}
