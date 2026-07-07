import type { ResolvedHomepageLayout } from "@/config/home";
import { layoutShowsHero } from "@/config/home";
import HomeSectionsPlaceholder from "@/components/HomeSectionsPlaceholder";
import { HomeHeroLayoutReserve } from "@/components/MostTalkedAboutHero";

/** Ελαφρύ placeholder — ίδιο ύψος με HomeBody ώστε χωρίς CLS στο handoff / lazy mount. */
export default function HomePageBodyShell({
  layout,
  staticLcpOnPage = false,
}: {
  layout?: ResolvedHomepageLayout;
  staticLcpOnPage?: boolean;
}) {
  const sections = (layout?.sections ?? []).filter((id) => id !== "hero");
  const hasHero = layout ? layoutShowsHero(layout) : true;

  return (
    <>
      {hasHero && !staticLcpOnPage ? <HomeHeroLayoutReserve /> : null}
      {sections.length ? (
        <HomeSectionsPlaceholder sections={sections} />
      ) : (
        <>
          <div className="section-black border-y border-white/[0.07] py-3 min-h-[3.25rem]" aria-hidden />
          <div className="min-h-[20rem] md:min-h-[22rem]" aria-hidden />
        </>
      )}
    </>
  );
}
