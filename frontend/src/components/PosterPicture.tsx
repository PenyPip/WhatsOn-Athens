/* eslint-disable @next/next/no-img-element */
import { useCallback } from "react";
import { splitPosterSources } from "@/lib/posterPicture";
import { cn } from "@/lib/utils";

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
  /** cover = γέμισμα πλαισίου · contain = ολόκληρη αφίσα (θέατρο). */
  fit?: "cover" | "contain";
};

/** Αφίσα με WebP όταν υπάρχει στο srcset - width/height για LCP/CLS. */
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
  fit = "cover",
}: PosterPictureProps) {
  const { fallbackSrc, fallbackSrcSet, webpSrc, webpSrcSet } = splitPosterSources(src, srcSet);
  const contain = fit === "contain";
  const pictureClass = contain ? "flex h-full w-full items-center justify-center" : "block h-full w-full";
  const imgClass = cn(
    contain ? "max-h-full max-w-full object-contain object-center" : "h-full w-full object-cover object-center",
    className,
  );

  /** Cached images συχνά δεν ξαναπυροδοτούν onLoad - έλεγχος complete στο mount. */
  const imgRef = useCallback(
    (node: HTMLImageElement | null) => {
      if (!node || !onLoad) return;
      if (node.complete && node.naturalWidth > 0) {
        onLoad();
      }
    },
    [onLoad],
  );

  const imgProps = {
    alt,
    width,
    height,
    loading,
    fetchPriority,
    decoding,
    onLoad,
    ref: imgRef,
    className: imgClass,
    sizes,
    ...(ariaHidden ? { "aria-hidden": true as const } : {}),
  };

  if (webpSrcSet || (webpSrc && webpSrc !== fallbackSrc)) {
    return (
      <picture className={pictureClass}>
        <source type="image/webp" srcSet={webpSrcSet ?? webpSrc} sizes={sizes} />
        <img
          {...imgProps}
          alt={alt}
          src={fallbackSrc}
          {...(fallbackSrcSet ? { srcSet: fallbackSrcSet } : {})}
        />
      </picture>
    );
  }

  return (
    <img
      {...imgProps}
      alt={alt}
      src={fallbackSrc}
      {...(fallbackSrcSet || srcSet ? { srcSet: fallbackSrcSet ?? srcSet ?? undefined } : {})}
    />
  );
}
