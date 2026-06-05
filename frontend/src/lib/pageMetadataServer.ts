import type { Metadata } from "next";
import {
  absolutePageUrl,
  formatPageTitle,
  getMetadataBase,
  inferOgType,
  posterOgImageSize,
  resolvePublicAssetUrl,
  siteSeo,
} from "@/lib/siteMetadata";
import { crawlPosterForPath } from "@/lib/crawlEnrichment";
import { seoCopyForPath } from "@/lib/jsonLdPage";

/** Next.js metadata ανά path — canonical, og:url, αφίσα entity στο αρχικό HTML. */
export function buildMetadataForPath(path: string): Metadata {
  const normalized = path === "" ? "/" : path.startsWith("/") ? path : `/${path}`;
  const { title, description } = seoCopyForPath(normalized);
  const fullTitle = formatPageTitle(title);
  const canonical = absolutePageUrl(normalized);
  const ogType = inferOgType(normalized);
  const posterUrl = crawlPosterForPath(normalized);
  const ogImageAbsolute = resolvePublicAssetUrl(posterUrl) ?? resolvePublicAssetUrl(siteSeo.ogImagePath);
  const isDetailWithPoster =
    /^\/(movies|theater|dining)\/[^/]+/.test(normalized) ||
    /^\/(reviews|articles|events)\/[^/]+/.test(normalized);
  const imageSize = isDetailWithPoster && posterUrl ? posterOgImageSize : { width: 1200, height: 630 };
  const ogAlt = posterUrl ? `${title} — αφίσα` : siteSeo.ogImageAlt;

  return {
    metadataBase: getMetadataBase(),
    title: {
      absolute: fullTitle,
    },
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: ogType,
      locale: "el_GR",
      url: canonical,
      siteName: siteSeo.siteName,
      title: fullTitle,
      description,
      images: ogImageAbsolute
        ? [
            {
              url: ogImageAbsolute,
              width: imageSize.width,
              height: imageSize.height,
              alt: ogAlt,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: ogImageAbsolute ? [ogImageAbsolute] : undefined,
    },
  };
}
