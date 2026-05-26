import { staticPageSeo } from "@/lib/pageSeoCopy";

/**
 * Server HTML κάτω από το hero — ζωγραφίζεται πριν το JS (Speed Index).
 * Κρύβεται όταν το SPA κάνει mount (`html.spa-mounted`).
 */
export default function HomeEarlyPaint() {
  const h1 = staticPageSeo.home.h1;

  const css =
    "#home-early-paint{background:#f0edf8;color:#1c1d62}" +
    "#home-early-paint .hep-hero-space{height:75vh;min-height:500px}" +
    "#home-early-paint .hep-intro{padding:2rem 1rem;border-bottom:1px solid rgba(28,29,98,.12)}" +
    "@media(min-width:768px){#home-early-paint .hep-intro{padding:2.5rem 1.5rem}}" +
    "#home-early-paint .hep-wrap{max-width:80rem;margin:0 auto}" +
    "#home-early-paint h2{margin:0;font-family:Georgia,serif;font-size:1.5rem;font-weight:700;line-height:1.2}" +
    "@media(min-width:768px){#home-early-paint h2{font-size:1.875rem}}" +
    "#home-early-paint p{margin:.75rem 0 0;font-family:system-ui,sans-serif;font-size:.875rem;line-height:1.6;color:rgba(28,29,98,.72);max-width:48rem}" +
    "#home-early-paint .hep-row{padding:2rem 1rem;border-bottom:1px solid rgba(28,29,98,.08)}" +
    "#home-early-paint .hep-bar{height:.75rem;border-radius:4px;background:rgba(28,29,98,.1);margin-bottom:1rem;width:8rem}" +
    "#home-early-paint .hep-title{height:1.75rem;border-radius:4px;background:rgba(28,29,98,.12);margin-bottom:1.25rem;width:14rem;max-width:60%}" +
    "#home-early-paint .hep-cards{display:flex;gap:1rem;overflow:hidden}" +
    "#home-early-paint .hep-card{flex:0 0 11rem;height:18rem;border-radius:8px;background:rgba(28,29,98,.07)}" +
    "@media(min-width:768px){#home-early-paint .hep-card{flex-basis:13rem;height:20rem}}" +
    "html.spa-mounted #home-early-paint{display:none!important}";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div id="home-early-paint" aria-hidden="true">
        <div className="hep-hero-space" />
        <div className="hep-intro">
          <div className="hep-wrap">
            <h2>{h1}</h2>
            <p>37Ν (the37n.gr) — πρόγραμμα ταινιών, κινηματογράφοι και ώρες προβολών στην Αθήνα.</p>
          </div>
        </div>
        {[0, 1].map((row) => (
          <div key={row} className="hep-row">
            <div className="hep-wrap">
              <div className="hep-bar" />
              <div className="hep-title" />
              <div className="hep-cards">
                {[0, 1, 2, 3].map((c) => (
                  <div key={c} className="hep-card" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
