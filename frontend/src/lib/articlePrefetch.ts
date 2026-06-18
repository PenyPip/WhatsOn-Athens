import type { QueryClient } from "@tanstack/react-query";
import { api, type StrapiArticle } from "@/lib/api";
import { CONTENT_QUERY_OPTIONS } from "@/lib/contentQuery";

const ARTICLE_LIST_LIMITS = [6, 100] as const;

/** Άρθρο από ήδη φορτωμένη λίστα (αρχική /articles) — άμεση εμφάνιση λεπτομέρειας χωρίς flash. */
export function findArticleInListCache(queryClient: QueryClient, slug: string): StrapiArticle | undefined {
  const key = slug.trim();
  if (!key) return undefined;
  for (const limit of ARTICLE_LIST_LIMITS) {
    const list = queryClient.getQueryData<StrapiArticle[]>(["articles", limit]);
    const hit = list?.find((a) => a.slug === key);
    if (hit) return hit;
  }
  return undefined;
}

export function prefetchArticleBySlug(queryClient: QueryClient, slug: string) {
  const key = slug.trim();
  if (!key) return Promise.resolve();
  return queryClient.prefetchQuery({
    queryKey: ["article", key],
    queryFn: () => api.getArticleBySlug(key),
    ...CONTENT_QUERY_OPTIONS,
    retry: 1,
    throwOnError: false,
  });
}

/** JS chunk λεπτομέρειας — πριν το κλικ, λιγότερο Suspense placeholder. */
export function prefetchArticleDetailChunk() {
  return import(/* webpackChunkName: "article-detail" */ "@/views/ArticleDetail");
}
