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
import ArticleRelatedEventCard from "@/components/ArticleRelatedEventCard";
import { resolveArticleRelated } from "@/lib/articleRelated";
import { eventHasDisplayableInfo } from "@/lib/eventLabels";
import { ARTICLE_COLUMN_CLASS, ARTICLE_PAGE_CLASS } from "@/lib/articleTypography";
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
  const related = resolveArticleRelated(article);
  const relatedEvent = article.relatedEvent;
  const relatedEventTitleFallback =
    relatedEvent?.slug?.trim() && relatedEvent.slug.trim() === article.slug?.trim()
      ? article.title
      : undefined;
  const hasRelatedEvent = Boolean(
    relatedEvent && eventHasDisplayableInfo(relatedEvent, { fallbackTitle: relatedEventTitleFallback }),
  );
  const hasRelatedMedia = Boolean(related);
  const hasTags = article.tags.length > 0;
  const hasImage = Boolean(article.featuredImageUrl);
  const kickerTag = article.tags[0]?.trim();
  const kickerLine = kickerTag
    ? `${typeUpper} · ${kickerTag.toLocaleUpperCase("el-GR")}`
    : typeUpper;

  return (
    <div className={cn(ARTICLE_PAGE_CLASS, "min-h-screen bg-white pb-20 md:pb-0")}>
      <div className={cn(ARTICLE_COLUMN_CLASS, "pt-20 pb-16 md:pt-28 md:pb-24 lg:pt-32")}>
          <Link
            to="/articles"
            className="font-article-ui mb-10 inline-flex items-center gap-1.5 text-xs font-medium text-[#1C1D62]/55 transition-colors hover:text-[#7C2B76]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Πίσω στα άρθρα
          </Link>

          <div className="flex w-full items-center gap-3 text-left">
            <span className="h-px w-10 shrink-0 bg-[#7C2B76]" aria-hidden />
            <p className="font-article-ui text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7C2B76]">
              {kickerLine}
            </p>
          </div>

          <h1 className="mt-6 w-full text-left font-article text-[2rem] font-bold leading-[1.12] tracking-tight text-[#13143E] md:text-[2.75rem] md:leading-[1.1] lg:text-[3rem]">
            {article.title}
          </h1>

          <p className="font-article-ui mt-5 w-full text-left text-[11px] font-medium uppercase tracking-[0.14em] text-[#1C1D62]/50">
            {dateUpper}
            <MetaDot />
            {typeUpper}
            <MetaDot />
            <span>Ανάγνωση ~{readingMin} λεπτά</span>
          </p>

          <hr className="mt-8 w-full border-0 border-t-2 border-[#13143E]" />

          {hasDeck ? (
            <p className="article-lead mt-8 w-full font-article text-xl font-medium leading-snug text-[#13143E]/90 md:text-2xl md:leading-snug">
              {article.metaDescription}
            </p>
          ) : null}

          {hasImage ? (
            <figure className="mt-8 w-full overflow-hidden text-left">
              <div className="aspect-[2/1] max-h-[11.5rem] w-full sm:max-h-[12.5rem] md:max-h-[13.5rem]">
                <img
                  src={article.featuredImageUrl}
                  alt={article.featuredImageAlt || article.title}
                  className="h-full w-full object-cover object-center"
                  loading="eager"
                  fetchPriority="high"
                  width={1200}
                  height={600}
                />
              </div>
              {article.featuredImageAlt ? (
                <figcaption className="font-article-ui mt-1.5 text-left text-[11px] text-[#1C1D62]/45">
                  {article.featuredImageAlt}
                </figcaption>
              ) : null}
            </figure>
          ) : null}

          <div className="mt-8 w-full text-left">
            {contentHtml ? (
              <article
                className="article-detail-prose"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            ) : (
              <p className="font-article-ui text-left text-sm italic text-[#1C1D62]/50">
                Δεν υπάρχει κείμενο για αυτό το άρθρο.
              </p>
            )}
          </div>

          {hasRelatedEvent && relatedEvent ? (
            <ArticleRelatedEventCard event={relatedEvent} titleFallback={relatedEventTitleFallback} />
          ) : null}

          {hasTags ? (
            <ArticleTags
              tags={article.tags}
              className="mt-12 w-full border-t border-[#1C1D62]/10 pt-8 text-left"
              variant="editorial"
            />
          ) : null}

          {hasRelatedMedia && related ? (
            <aside className="mt-12 w-full rounded-lg border border-[#1C1D62]/10 bg-[#F0EDF8]/50 px-5 py-5 text-left md:px-6">
              <p className="font-article-ui text-[10px] font-bold uppercase tracking-[0.18em] text-[#7C2B76]">
                {related.sectionLabel}
              </p>
              {related.href ? (
                <Link
                  to={related.href}
                  className="mt-2 block font-article text-lg font-semibold text-[#13143E] transition-colors hover:text-[#7C2B76]"
                >
                  {related.title}
                </Link>
              ) : (
                <p className="mt-2 font-article text-lg font-semibold text-[#13143E]">{related.title}</p>
              )}
            </aside>
          ) : null}

          <footer className="mt-14 flex w-full flex-wrap items-center justify-between gap-4 border-t border-[#1C1D62]/10 pt-8 text-left">
            <Link
              to="/articles"
              className="font-article-ui inline-flex items-center gap-1.5 text-sm font-semibold text-[#7C2B76] transition-colors hover:text-[#13143E]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Όλα τα άρθρα
            </Link>
            <p className="font-article-ui text-[11px] uppercase tracking-[0.1em] text-[#1C1D62]/45">{typeLabel}</p>
          </footer>
      </div>

      <Footer />
    </div>
  );
}
