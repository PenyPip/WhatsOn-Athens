import type { HomeSectionId } from "@/config/home";

const SHELL_CLASS =
  "section-black home-below-fold border-y border-white/[0.07] min-h-[20rem] md:min-h-[24rem]";

/** Reserved height για below-fold ενότητες — desktop idle defer (TBT). */
export default function HomeBelowFoldSectionShell({ id }: { id: HomeSectionId }) {
  const tall = id === "summer_venues" || id === "tours";
  return (
    <section
      className={`${SHELL_CLASS}${tall ? " min-h-[28rem] md:min-h-[32rem]" : ""}`}
      aria-hidden="true"
    />
  );
}
