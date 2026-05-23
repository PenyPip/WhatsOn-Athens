/** Server-only LCP — ζωγραφίζεται από HTML πριν το React (μειώνει element render delay). */
type HomeStaticLcpProps = {
  posterHref: string;
  title: string;
};

const CRITICAL_CSS = `#home-static-lcp{position:relative;overflow:hidden;background:#111;margin-top:-4rem;padding-top:4rem;min-height:380px;height:min(75vh,520px);contain:layout style paint}@media(min-width:768px){#home-static-lcp{margin-top:-7rem;padding-top:7rem}}#home-static-lcp img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:1}#home-static-lcp .home-static-lcp__shade{position:absolute;inset:0;background:linear-gradient(to top,#111 0%,rgba(17,17,17,.45) 45%,rgba(17,17,17,.15) 100%);pointer-events:none}`;

export default function HomeStaticLcp({ posterHref, title }: HomeStaticLcpProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }} />
      <div id="home-static-lcp">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={posterHref}
          alt={title ? `Αφίσα ταινίας «${title}»` : ""}
          width={640}
          height={960}
          fetchPriority="high"
          loading="eager"
          decoding="sync"
          sizes="(max-width: 768px) 100vw, 800px"
        />
        <div className="home-static-lcp__shade" aria-hidden="true" />
        {title ? <h1 className="sr-only">{title}</h1> : null}
      </div>
    </>
  );
}
