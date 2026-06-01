import { lcpImageSrc } from "@/lib/lcpImageSrc";
import { homeHeroCriticalCss } from "@/lib/homeHeroLayout";

/** Server LCP μέσα στο #home-hero-slot — in-flow, όχι fixed (λιγότερο CLS). */
type HomeStaticLcpProps = {
  posterHref: string;
  title: string;
};

export default function HomeStaticLcp({ posterHref, title }: HomeStaticLcpProps) {
  const src = lcpImageSrc(posterHref);
  const displayTitle = title?.trim() || "Ταινία";

  const criticalCss =
    "html,body{margin:0;min-height:100%}body{font-family:system-ui,-apple-system,sans-serif;background:#f0edf8;color:#1c1d62}" +
    homeHeroCriticalCss();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: criticalCss }} />
      <div id="home-hero-slot">
        <div id="home-static-lcp">
          <div className="home-static-lcp__inner">
            <div className="home-static-lcp__copy">
              <span className="home-static-lcp__badge">Πιο πολυσυζητημένες</span>
              <p className="home-static-lcp__title">{displayTitle}</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- LCP: πρέπει στο αρχικό HTML */}
            <div className="home-static-lcp__poster-wrap">
              <img
                className="home-static-lcp__poster"
                src={src}
                alt={displayTitle}
                width={416}
                height={624}
                fetchPriority="high"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
