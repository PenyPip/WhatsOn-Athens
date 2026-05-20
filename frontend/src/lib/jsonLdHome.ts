import { absolutePageUrl, resolvePublicAssetUrl, siteSeo } from "@/lib/siteMetadata";

/** WebSite + Organization για την αρχική (SEO). */
export function buildHomeJsonLd(): Record<string, unknown> {
  const homeUrl = absolutePageUrl("/");
  const logo = resolvePublicAssetUrl(siteSeo.ogImagePath);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${homeUrl}#organization`,
        name: siteSeo.siteName,
        url: homeUrl,
        logo: logo ? { "@type": "ImageObject", url: logo } : undefined,
      },
      {
        "@type": "WebSite",
        "@id": `${homeUrl}#website`,
        name: siteSeo.siteName,
        url: homeUrl,
        description: siteSeo.description,
        inLanguage: "el-GR",
        publisher: { "@id": `${homeUrl}#organization` },
      },
    ],
  };
}
