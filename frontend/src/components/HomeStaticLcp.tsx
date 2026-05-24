import { lcpImageSrc } from "@/lib/lcpImageSrc";

/** Server-only LCP — fixed overlay, χωρίς layout shift όταν κρύβεται μετά το hydration. */
type HomeStaticLcpProps = {
  posterHref: string;
  title: string;
};

const CRITICAL_CSS =
  "html,body{margin:0;min-height:100%}body{font-family:system-ui,-apple-system,sans-serif;background:#111;color:#f0edf8}" +
  "#home-static-lcp{position:fixed;inset:0 auto auto 0;z-index:1;width:100%;overflow:hidden;background:#111;height:min(75vh,520px);contain:layout style paint;pointer-events:none}" +
  "#home-static-lcp img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:1}" +
  "#home-static-lcp .home-static-lcp__shade{position:absolute;inset:0;background:linear-gradient(to top,#111 0%,rgba(17,17,17,.45) 45%,rgba(17,17,17,.15) 100%);pointer-events:none}" +
  "html.spa-lcp-done #home-static-lcp{opacity:0;visibility:hidden;pointer-events:none}" +
  ".sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}";

export default function HomeStaticLcp({ posterHref, title }: HomeStaticLcpProps) {
  const src = lcpImageSrc(posterHref);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }} />
      <div id="home-static-lcp" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={640}
          height={960}
          fetchPriority="high"
          loading="eager"
          decoding="async"
          sizes="(max-width: 768px) 100vw, 800px"
        />
        <div className="home-static-lcp__shade" />
        {title ? <h1 className="sr-only">{title}</h1> : null}
      </div>
    </>
  );
}
