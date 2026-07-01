import type { HomeSectionId } from "@/config/home";

const SECTION_MIN_H: Partial<Record<HomeSectionId, string>> = {
  strip: "min-h-[3rem]",
  movies_today: "min-h-[20rem] md:min-h-[22rem]",
  summer_cinema: "min-h-[26rem] md:min-h-[28rem]",
  summer_venues: "min-h-[28rem] md:min-h-[32rem]",
  tours: "min-h-[20rem]",
  new_articles: "min-h-[22rem]",
  events: "min-h-[22rem]",
  new_movies: "min-h-[20rem] md:min-h-[22rem]",
  movies_week: "min-h-[14rem] md:min-h-[16rem]",
  coming_soon: "min-h-[20rem] md:min-h-[22rem]",
  dining: "min-h-[20rem]",
  newsletter: "min-h-[10rem]",
};

type Props = {
  sections: HomeSectionId[];
};

/** Κρατά χώρο κάτω από hero — χωρίς βαριά components πριν το idle chunk. */
export default function HomeSectionsPlaceholder({ sections }: Props) {
  return (
    <>
      {sections.map((id) => (
        <div key={id} className={SECTION_MIN_H[id] ?? "min-h-[12rem]"} aria-hidden />
      ))}
    </>
  );
}
