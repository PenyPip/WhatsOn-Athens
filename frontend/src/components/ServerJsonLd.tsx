import { buildPageJsonLd } from "@/lib/jsonLdPage";
import type { HomeCrawlSnapshot, MoviesListCrawlSnapshot } from "@/lib/crawlTypes";

/** JSON-LD στο server HTML (ορατό σε crawlers χωρίς JS). */
export default function ServerJsonLd({
  path,
  homeCrawl,
  moviesCrawl,
}: {
  path: string;
  homeCrawl?: HomeCrawlSnapshot | null;
  moviesCrawl?: MoviesListCrawlSnapshot | null;
}) {
  const data = buildPageJsonLd(path, { homeCrawl, moviesCrawl });
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script type="application/ld+json" suppressHydrationWarning>
      {json}
    </script>
  );
}
