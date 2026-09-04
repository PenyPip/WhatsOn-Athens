import { HOME_HERO_SPACER_CLASS } from "@/lib/homeHeroLayout";

/** In-flow reserve - ίδιο κάτω άκρο με το absolute hero (380/580px). */
export function HomeHeroLayoutReserve() {
  return <div id="home-hero-ssr-spacer" className={HOME_HERO_SPACER_CLASS} aria-hidden="true" />;
}
