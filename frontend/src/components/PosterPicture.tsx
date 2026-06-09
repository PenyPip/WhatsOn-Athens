/* eslint-disable @next/next/no-img-element */
import { splitPosterSources } from "@/lib/posterPicture";

type PosterPictureProps = {
  src: string;
  srcSet?: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  decoding?: "async" | "sync" | "auto";
  onLoad?: () => void;
  "aria-hidden"?: boolean;
};

/** Αφίσα με WebP όταν υπάρχει στο srcset — width/height για LCP/CLS. */
export default function PosterPicture({
  src,
  srcSet,
  alt,
  width = 400,
  height = 600,
  className = "",
  sizes,
  loading = "lazy",
  fetchPriority,
  decoding = "async",
  onLoad,
  "aria-hidden": ariaHidden,
}: PosterPictureProps) {
  const { fallbackSrc, fallbackSrcSet, webpSrc, webpSrcSet } = splitPosterSources(src, srcSet);
  const imgProps = {
    alt,
    width,
    height,
    loading,
    fetchPriority,
    decoding,
    onLoad,
    className,
    sizes,
    ...(ariaHidden ? { "aria-hidden": true as const } : {}),
  };

  if (webpSrcSet || (webpSrc && webpSrc !== fallbackSrc)) {
    return (
      <picture className="block h-full w-full">
        <source type="image/webp" srcSet={webpSrcSet ?? webpSrc} sizes={sizes} />
        <img alt={alt} src={fallbackSrc} srcSet={fallbackSrcSet} {...imgProps} />
      </picture>
    );
  }

  return <img alt={alt} src={fallbackSrc} srcSet={fallbackSrcSet ?? srcSet ?? undefined} {...imgProps} />;
}
