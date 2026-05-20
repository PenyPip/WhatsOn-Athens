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
import { seoCopyForPath } from "@/lib/jsonLdPage";

/** Next.js metadata ανά path — canonical, og:url στο αρχικό HTML. */
export function buildMetadataForPath(path: string): Metadata {
  const normalized = path === "" ? "/" : path.startsWith("/") ? path : `/${path}`;
  const { title, description } = seoCopyForPath(normalized);
  const fullTitle = formatPageTitle(title);
  const canonical = absolutePageUrl(normalized);
  const ogType = inferOgType(normalized);
  const isDetailWithPoster =
    /^\/(movies|theater|dining)\/[^/]+/.test(normalized) || /^\/reviews\/[^/]+/.test(normalized);
  const imageSize = isDetailWithPoster ? posterOgImageSize : { width: 1200, height: 630 };
  const ogImage = resolvePublicAssetUrl(siteSeo.ogImagePath);

  return {
    metadataBase: getMetadataBase(),
    title: fullTitle,
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
      images: ogImage
        ? [
            {
              url: siteSeo.ogImagePath,
              width: imageSize.width,
              height: imageSize.height,
              alt: siteSeo.ogImageAlt,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: ogImage ? [siteSeo.ogImagePath] : undefined,
    },
  };
}
