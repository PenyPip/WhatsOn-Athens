import { lcpImageSrc } from "@/lib/lcpImageSrc";

/** Server-only LCP overlay — μόνο κινητό (desktop: preload + Hero, χωρίς δεύτερο download). */
type HomeStaticLcpProps = {
  posterHref: string;
  title: string;
};

function cssEscapeUrl(url: string): string {
  return url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export default function HomeStaticLcp({ posterHref, title }: HomeStaticLcpProps) {
  const src = cssEscapeUrl(lcpImageSrc(posterHref));

  const criticalCss =
    "html,body{margin:0;min-height:100%}body{font-family:system-ui,-apple-system,sans-serif;background:#111;color:#f0edf8}" +
    "#home-static-lcp{display:none}" +
    `@media (max-width:767px){#home-static-lcp{display:block;position:fixed;inset:0 auto auto 0;z-index:1;width:100%;overflow:hidden;background:#111 url("${src}") center/cover no-repeat;height:75vh;min-height:500px;contain:layout style paint;pointer-events:none}` +
    "#home-static-lcp .home-static-lcp__shade{position:absolute;inset:0;background:linear-gradient(to top,#111 0%,rgba(17,17,17,.45) 45%,rgba(17,17,17,.15) 100%);pointer-events:none}" +
    "html.spa-lcp-done #home-static-lcp{opacity:0;visibility:hidden;pointer-events:none}}" +
    ".sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: criticalCss }} />
      <div id="home-static-lcp" aria-hidden="true">
        <div className="home-static-lcp__shade" />
        {title ? <h1 className="sr-only">{title}</h1> : null}
      </div>
    </>
  );
}
