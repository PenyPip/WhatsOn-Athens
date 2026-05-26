import { lcpImageSrc } from "@/lib/lcpImageSrc";

/** Server-only LCP — `<img>` + ορατός τίτλος (critical CSS) για LCP & Speed Index. */
type HomeStaticLcpProps = {
  posterHref: string;
  title: string;
};

export default function HomeStaticLcp({ posterHref, title }: HomeStaticLcpProps) {
  const src = lcpImageSrc(posterHref);
  const displayTitle = title?.trim() || "Προτεινόμενη ταινία";

  const criticalCss =
    "html,body{margin:0;min-height:100%}body{font-family:system-ui,-apple-system,sans-serif;background:#111;color:#f0edf8}" +
    "#home-static-lcp{position:fixed;top:0;left:0;z-index:1;width:100%;height:75vh;min-height:500px;overflow:hidden;background:#111;contain:layout style paint;pointer-events:none}" +
    "#home-static-lcp img{display:block;width:100%;height:100%;object-fit:cover;opacity:.55}" +
    "#home-static-lcp .home-static-lcp__shade{position:absolute;inset:0;background:linear-gradient(to top,#111 0%,rgba(17,17,17,.45) 45%,rgba(17,17,17,.15) 100%);pointer-events:none}" +
    "#home-static-lcp .home-static-lcp__copy{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:0 1rem 4rem;max-width:42rem;margin:0 auto;box-sizing:border-box}" +
    "@media(min-width:768px){#home-static-lcp .home-static-lcp__copy{padding:0 1.5rem 5rem;max-width:80rem;margin:0 auto}}" +
    "#home-static-lcp .home-static-lcp__kicker{display:block;margin:0 0 .5rem;font:600 10px/1.2 system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.7)}" +
    "#home-static-lcp .home-static-lcp__title{margin:0;font-family:Georgia,serif;font-size:2.25rem;font-weight:700;line-height:1.1;color:#fff}" +
    "@media(min-width:768px){#home-static-lcp .home-static-lcp__title{font-size:3.75rem}}" +
    "html.spa-lcp-done #home-static-lcp{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .2s ease}";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: criticalCss }} />
      <div id="home-static-lcp">
        {/* eslint-disable-next-line @next/next/no-img-element -- LCP: πρέπει στο αρχικό HTML */}
        <img
          src={src}
          alt={displayTitle}
          width={640}
          height={960}
          fetchPriority="high"
          loading="eager"
          decoding="async"
        />
        <div className="home-static-lcp__shade" />
        <div className="home-static-lcp__copy">
          <span className="home-static-lcp__kicker">Προτεινόμενη ταινία</span>
          <p className="home-static-lcp__title">{displayTitle}</p>
        </div>
      </div>
    </>
  );
}
