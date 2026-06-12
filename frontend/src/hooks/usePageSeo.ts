import { useEffect, useRef } from "react";
import {
  absolutePageUrl,
  defaultOgImageSize,
  formatPageTitle,
  inferOgType,
  posterOgImageSize,
  resolvePublicAssetUrl,
  siteSeo,
  truncateDescription,
  type OgPageType,
} from "@/lib/siteMetadata";

export type PageSeoInput = {
  /** Τίτλος χωρίς το «· 37Ν» (προστίθεται αυτόματα). */
  title: string;
  description?: string;
  /** Διαδρομή για og:url (και canonical αν λείπει το canonicalPath). */
  path?: string;
  /** Καθαρό canonical χωρίς query. */
  canonicalPath?: string;
  /** Σχετικό ή απόλυτο URL εικόνας (αφίσα κ.λπ.). */
  image?: string | null;
  imageAlt?: string;
  /** Προεπιλογή από path· override για ειδικές σελίδες. */
  ogType?: OgPageType;
  /** Διαστάσεις og:image (προεπιλογή: site 1200×630 ή αφίσα 800×1200). */
  imageWidth?: number;
  imageHeight?: number;
  /** YouTube embed URL για og:video (ταινίες με τρέιλερ). */
  videoUrl?: string | null;
  /** Open Graph / Twitter title — χωρίς «· 37Ν» (override). */
  ogTitle?: string;
  /** Open Graph / Twitter description (override). */
  ogDescription?: string;
  /** Μην ευρετηριάζεται (404, προφίλ, φίλτρα λίστας). */
  noIndex?: boolean;
  enabled?: boolean;
};

const OG_VIDEO_KEYS = ["og:video", "og:video:secure_url", "og:video:type"] as const;

type ManagedTag = { el: HTMLMetaElement | HTMLLinkElement; key: string };

const OG_IMAGE_DIM_KEYS = ["og:image:width", "og:image:height", "og:image:alt"] as const;

function upsertMeta(attr: "name" | "property", key: string, content: string): HTMLMetaElement {
  const sel = `meta[${attr}="${key}"]`;
  let el = document.querySelector(sel) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
  return el;
}

function removeMeta(attr: "name" | "property", key: string) {
  document.querySelector(`meta[${attr}="${key}"]`)?.remove();
}

function upsertLink(rel: string, href: string): HTMLLinkElement {
  const sel = `link[rel="${rel}"]`;
  let el = document.querySelector(sel) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  return el;
}

function applySocialMeta(opts: {
  title: string;
  description: string;
  pageUrl: string;
  imageUrl?: string;
  imageAlt: string;
  ogType: OgPageType;
  imageWidth: number;
  imageHeight: number;
  videoUrl?: string;
}) {
  const { title, description, pageUrl, imageUrl, imageAlt, ogType, imageWidth, imageHeight, videoUrl } = opts;

  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:url", pageUrl);
  upsertMeta("property", "og:site_name", siteSeo.siteName);
  upsertMeta("property", "og:locale", "el_GR");
  upsertMeta("property", "og:type", ogType);

  if (imageUrl) {
    upsertMeta("property", "og:image", imageUrl);
    upsertMeta("property", "og:image:width", String(imageWidth));
    upsertMeta("property", "og:image:height", String(imageHeight));
    upsertMeta("property", "og:image:alt", imageAlt);
  } else {
    for (const k of OG_IMAGE_DIM_KEYS) removeMeta("property", k);
    removeMeta("property", "og:image");
  }

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  if (imageUrl) {
    upsertMeta("name", "twitter:image", imageUrl);
    upsertMeta("name", "twitter:image:alt", imageAlt);
  } else {
    removeMeta("name", "twitter:image");
    removeMeta("name", "twitter:image:alt");
  }

  if (videoUrl) {
    upsertMeta("property", "og:video", videoUrl);
    upsertMeta("property", "og:video:secure_url", videoUrl);
    upsertMeta("property", "og:video:type", "text/html");
  } else {
    for (const k of OG_VIDEO_KEYS) removeMeta("property", k);
  }
}

function applyDefaults(managed: ManagedTag[]) {
  document.title = siteSeo.titleDefault;
  managed.push({ el: upsertMeta("name", "description", siteSeo.description), key: "description" });

  const canonical = absolutePageUrl("/");
  managed.push({ el: upsertLink("canonical", canonical), key: "canonical" });

  const ogImg = resolvePublicAssetUrl(siteSeo.ogImagePath);
  applySocialMeta({
    title: siteSeo.titleDefault,
    description: siteSeo.description,
    pageUrl: canonical,
    imageUrl: ogImg,
    imageAlt: siteSeo.ogImageAlt,
    ogType: "website",
    imageWidth: defaultOgImageSize.width,
    imageHeight: defaultOgImageSize.height,
  });

  const robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
  if (robots) robots.remove();
}

/**
 * Ενημέρωση title, description, canonical, Open Graph και Twitter ανά route (SPA).
 */
export function usePageSeo(input: PageSeoInput | null | undefined) {
  const managedRef = useRef<ManagedTag[]>([]);

  useEffect(() => {
    const prevTitle = document.title;
    managedRef.current = [];

    const enabled = input?.enabled !== false && Boolean(input?.title?.trim());
    if (!enabled || !input) {
      applyDefaults(managedRef.current);
      return () => {
        document.title = prevTitle;
        applyDefaults([]);
      };
    }

    const fullTitle = formatPageTitle(input.title);
    const description = truncateDescription(input.description?.trim() || siteSeo.description);
    const socialTitle = input.ogTitle?.trim() || fullTitle;
    const socialDescription = truncateDescription(
      input.ogDescription?.trim() || input.description?.trim() || siteSeo.description,
    );
    const canonicalUrl = absolutePageUrl(input.canonicalPath ?? input.path ?? "/");
    const pageUrl = input.path ? absolutePageUrl(input.path) : canonicalUrl;
    const customImage = resolvePublicAssetUrl(input.image);
    const imageUrl = customImage ?? resolvePublicAssetUrl(siteSeo.ogImagePath);
    const imageAlt = input.imageAlt?.trim() || siteSeo.ogImageAlt;
    const ogType = input.ogType ?? inferOgType(input.path);
    const usingPoster = Boolean(customImage);
    const imageWidth = input.imageWidth ?? (usingPoster ? posterOgImageSize.width : defaultOgImageSize.width);
    const imageHeight = input.imageHeight ?? (usingPoster ? posterOgImageSize.height : defaultOgImageSize.height);

    document.title = fullTitle;
    managedRef.current.push({ el: upsertMeta("name", "description", description), key: "description" });
    managedRef.current.push({ el: upsertLink("canonical", canonicalUrl), key: "canonical" });

    const videoUrl = input.videoUrl?.trim() || undefined;

    applySocialMeta({
      title: socialTitle,
      description: socialDescription,
      pageUrl,
      imageUrl,
      imageAlt,
      ogType,
      imageWidth,
      imageHeight,
      videoUrl,
    });

    if (input.noIndex) {
      managedRef.current.push({
        el: upsertMeta("name", "robots", "noindex, nofollow"),
        key: "robots",
      });
    } else {
      removeMeta("name", "robots");
    }

    return () => {
      document.title = prevTitle;
      applyDefaults([]);
    };
  }, [input]);
}
