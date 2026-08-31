import type { ResolvedHomepageLayout } from "@/config/home";
import HomeSectionsPlaceholder from "@/components/HomeSectionsPlaceholder";

/** Ελαφρύ placeholder — ίδιο ύψος με HomeBody ώστε χωρίς CLS στο handoff / lazy mount. */
export default function HomePageBodyShell({
  layout,
}: {
  layout?: ResolvedHomepageLayout;
}) {
  const sections = (layout?.sections ?? []).filter((id) => id !== "hero");

  return (
    <>
      {sections.length ? (
        <HomeSectionsPlaceholder sections={sections} />
      ) : (
        <>
          <div className="section-black border-y border-white/[0.07] py-3 min-h-[3.25rem]" aria-hidden />
          <div className="min-h-[32rem] md:min-h-[36rem]" aria-hidden />
        </>
      )}
    </>
  );
}
