import { staticPageSeo } from "@/lib/pageSeoCopy";

/** Σεμαντικό H1 αρχικής στο server HTML (Lighthouse SEO / accessibility). */
export default function HomePageH1() {
  return (
    <h1
      id="home-page-title"
      className="sr-only"
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
    >
      {staticPageSeo.home.h1}
    </h1>
  );
}
