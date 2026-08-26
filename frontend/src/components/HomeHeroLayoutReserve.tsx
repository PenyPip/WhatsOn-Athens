import { HOME_HERO_SPACER_CLASS } from "@/lib/homeHeroLayout";

/** In-flow reserve όταν δεν υπάρχει `#home-hero-ssr-spacer` (χωρίς static LCP) — ίδιο κάτω άκρο με το absolute hero. */
export function HomeHeroLayoutReserve() {
  return <div className={HOME_HERO_SPACER_CLASS} aria-hidden="true" />;
}
