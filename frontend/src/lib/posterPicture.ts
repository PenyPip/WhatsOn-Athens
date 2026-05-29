/** Διαχωρισμός WebP / fallback από Strapi srcset ή URL. */
export function splitPosterSources(
  src: string,
  srcSet?: string | null,
): { fallbackSrc: string; fallbackSrcSet?: string; webpSrc?: string; webpSrcSet?: string } {
  const trimmedSet = typeof srcSet === "string" ? srcSet.trim() : "";
  if (!trimmedSet) {
    if (/\.webp(\?|$)/i.test(src)) {
      return { fallbackSrc: src, webpSrc: src };
    }
    return { fallbackSrc: src };
  }

  const webpParts: string[] = [];
  const fallbackParts: string[] = [];
  for (const part of trimmedSet.split(",")) {
    const bit = part.trim();
    if (!bit) continue;
    if (/\.webp(\?|\s)/i.test(bit)) webpParts.push(bit);
    else fallbackParts.push(bit);
  }

  return {
    fallbackSrc: src,
    fallbackSrcSet: fallbackParts.length > 0 ? fallbackParts.join(", ") : trimmedSet,
    webpSrc: webpParts.length === 1 ? webpParts[0].split(/\s+/)[0] : undefined,
    webpSrcSet: webpParts.length > 0 ? webpParts.join(", ") : undefined,
  };
}
