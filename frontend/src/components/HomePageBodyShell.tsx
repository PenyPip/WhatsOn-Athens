import { HomeHeroLayoutReserve } from "@/components/MostTalkedAboutHero";

/** Ελαφρύ placeholder όσο το lazy HomeBody δεν έχει mount (mobile LCP path). */
export default function HomePageBodyShell() {
  return (
    <>
      <HomeHeroLayoutReserve />
      <div className="section-black border-y border-white/[0.07] py-3 min-h-[3.25rem]" aria-hidden />
      <div className="min-h-[20rem] md:min-h-[22rem]" aria-hidden />
    </>
  );
}
