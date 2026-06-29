/* eslint-disable @next/next/no-img-element */
import { lcpImageSrc } from "@/lib/lcpImageSrc";
import { HOME_HERO_CRITICAL_CSS } from "@/lib/homeHeroLayout";

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

  const criticalCss =
    "html,body{margin:0;min-height:100%}body{font-family:system-ui,-apple-system,sans-serif;background:#f0edf8;color:#1c1d62}" +
    HOME_HERO_CRITICAL_CSS;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: criticalCss }} />
      <div id="home-hero-slot">
        <div id="home-static-lcp">
          <div className="home-static-lcp__inner">
            <div className="home-static-lcp__copy">
              <span className="home-static-lcp__badge">Πολυσυζητημένες</span>
              <p className="home-static-lcp__title">{displayTitle}</p>
              {displaySynopsis ? <p className="home-static-lcp__synopsis">{displaySynopsis}</p> : null}
            </div>
            <div className="home-static-lcp__poster-wrap">
              <img
                className="home-static-lcp__poster"
                src={src}
                alt={displayTitle}
                width={320}
                height={480}
                fetchPriority="high"
                loading="eager"
                decoding="sync"
                sizes="(max-width: 768px) 152px, 240px"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
