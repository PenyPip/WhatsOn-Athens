/* eslint-disable @next/next/no-img-element */
import { lcpImageSrc } from "@/lib/lcpImageSrc";

/** Server LCP μέσα στο #home-hero-slot — absolute overlay, χωρίς negative-margin handoff (CLS). */
type HomeStaticLcpProps = {
  posterHref: string;
  title: string;
  synopsis?: string;
};

export default function HomeStaticLcp({ posterHref, title, synopsis }: HomeStaticLcpProps) {
  const src = lcpImageSrc(posterHref);
  const displayTitle = title?.trim() || "Ταινία";
  const displaySynopsis = synopsis?.trim() ?? "";

  /**
   * Το critical CSS (hero + spacer) είναι ήδη στο <head> (`layout.tsx`).
   * Κρατάμε εδώ μόνο το markup — αποφεύγουμε διπλό ~4KB style στο body.
   */
  return (
    <div id="home-hero-slot">
      <div id="home-static-lcp">
        <div className="home-static-lcp__inner">
          <div className="home-static-lcp__copy">
            <span className="home-static-lcp__badge">Πολυσυζητημένες</span>
            <h1 id="home-page-title" className="home-static-lcp__title">{displayTitle}</h1>
            {displaySynopsis ? <p className="home-static-lcp__synopsis">{displaySynopsis}</p> : null}
          </div>
          <div className="home-static-lcp__poster-wrap">
            <img
              className="home-static-lcp__poster"
              src={src}
              alt={displayTitle}
              width={480}
              height={720}
              fetchPriority="high"
              loading="eager"
              decoding="async"
              sizes="(max-width: 768px) 176px, 248px"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
