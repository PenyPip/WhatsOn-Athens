import { buildPageJsonLd } from "@/lib/jsonLdPage";
import type { DetailCrawlSnapshot, HomeCrawlSnapshot, MoviesListCrawlSnapshot } from "@/lib/crawlTypes";

/** JSON-LD στο server HTML (ορατό σε crawlers χωρίς JS). */
export default function ServerJsonLd({
  path,
  homeCrawl,
  moviesCrawl,
  detailCrawl,
}: {
  path: string;
  homeCrawl?: HomeCrawlSnapshot | null;
  moviesCrawl?: MoviesListCrawlSnapshot | null;
  detailCrawl?: DetailCrawlSnapshot | null;
}) {
  const data = buildPageJsonLd(path, { homeCrawl, moviesCrawl, detailCrawl });
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script type="application/ld+json" suppressHydrationWarning>
      {json}
    </script>
  );
}
