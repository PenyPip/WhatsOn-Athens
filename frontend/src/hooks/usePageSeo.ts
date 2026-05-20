import { useEffect, useRef } from "react";
import {
  absolutePageUrl,
  formatPageTitle,
  resolvePublicAssetUrl,
  siteSeo,
  truncateDescription,
} from "@/lib/siteMetadata";

export type PageSeoInput = {
  /** Τίτλος χωρίς το «· 37Ν» (προστίθεται αυτόματα). */
  title: string;
  description?: string;
  /** Διαδρομή για canonical & og:url, π.χ. `/movies/foo`. */
  path?: string;
  /** Σχετικό ή απόλυτο URL εικόνας (αφίσα κ.λπ.). */
  image?: string | null;
  imageAlt?: string;
  /** Μην ευρετηριάζεται (404, προφίλ κ.λπ.). */
  noIndex?: boolean;
  /** Αν false, δεν ενημερώνει τίτλο/meta (π.χ. κατά τη φόρτωση). */
  enabled?: boolean;
};

type ManagedTag = { el: HTMLMetaElement | HTMLLinkElement; key: string };

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

function applyDefaults(managed: ManagedTag[]) {
  document.title = siteSeo.titleDefault;
  managed.push({ el: upsertMeta("name", "description", siteSeo.description), key: "description" });

  const canonical = absolutePageUrl("/");
  managed.push({ el: upsertLink("canonical", canonical), key: "canonical" });

  upsertMeta("property", "og:title", siteSeo.titleDefault);
  upsertMeta("property", "og:description", siteSeo.description);
  upsertMeta("property", "og:url", canonical);
  const ogImg = resolvePublicAssetUrl(siteSeo.ogImagePath);
  if (ogImg) upsertMeta("property", "og:image", ogImg);
  upsertMeta("property", "og:image:alt", siteSeo.ogImageAlt);
  upsertMeta("property", "og:site_name", siteSeo.siteName);
  upsertMeta("property", "og:locale", "el_GR");
  upsertMeta("property", "og:type", "website");

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", siteSeo.titleDefault);
  upsertMeta("name", "twitter:description", siteSeo.description);
  if (ogImg) upsertMeta("name", "twitter:image", ogImg);

  const robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
  if (robots) robots.remove();
}

/**
 * Ενημέρωση title, description, canonical και Open Graph ανά route (SPA).
 * Στο unmount επαναφέρει τα global defaults από το root layout.
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
    const pageUrl = input.path ? absolutePageUrl(input.path) : absolutePageUrl("/");
    const imageUrl = resolvePublicAssetUrl(input.image) ?? resolvePublicAssetUrl(siteSeo.ogImagePath);
    const imageAlt = input.imageAlt?.trim() || siteSeo.ogImageAlt;

    document.title = fullTitle;
    managedRef.current.push({ el: upsertMeta("name", "description", description), key: "description" });
    managedRef.current.push({ el: upsertLink("canonical", pageUrl), key: "canonical" });

    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", pageUrl);
    if (imageUrl) upsertMeta("property", "og:image", imageUrl);
    upsertMeta("property", "og:image:alt", imageAlt);
    upsertMeta("property", "og:site_name", siteSeo.siteName);
    upsertMeta("property", "og:locale", "el_GR");
    upsertMeta("property", "og:type", input.path?.startsWith("/movies/") || input.path?.startsWith("/theater/") ? "article" : "website");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", description);
    if (imageUrl) upsertMeta("name", "twitter:image", imageUrl);

    if (input.noIndex) {
      managedRef.current.push({
        el: upsertMeta("name", "robots", "noindex, nofollow"),
        key: "robots",
      });
    } else {
      const robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
      if (robots) robots.remove();
    }

    return () => {
      document.title = prevTitle;
      applyDefaults([]);
    };
  }, [input]);
}
