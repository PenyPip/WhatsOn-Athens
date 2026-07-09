import { HOME_HERO_COMPACT_SECTION_CLASS } from "@/lib/homeHeroLayout";
import { cn } from "@/lib/utils";

/** Κρατάει 380/580px στο overlap main όσο το static LCP είναι ενεργό — αποφυγή CLS όταν φορτώνει το live hero. */
export function HomeHeroLayoutReserve() {
  return <section className={cn(HOME_HERO_COMPACT_SECTION_CLASS, "invisible")} aria-hidden="true" />;
}
