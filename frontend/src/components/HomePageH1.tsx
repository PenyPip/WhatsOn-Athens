import { staticPageSeo } from "@/lib/pageSeoCopy";

/** Σεμαντικό H1 αρχικής στο server HTML (Lighthouse SEO / accessibility). */
export default function HomePageH1() {
  return (
    <h1 id="home-page-title" className="sr-only">
      {staticPageSeo.home.h1}
    </h1>
  );
}
