import type { HomeSectionId } from "@/config/home";

/** Προσεγγιστικά ίδια ύψη με τα loading shells του HomeBody (padding + header + cards). */
const SECTION_MIN_H: Partial<Record<HomeSectionId, string>> = {
  strip: "min-h-[3.25rem]",
  movies_today: "min-h-[32rem] md:min-h-[36rem]",
  summer_cinema: "min-h-[38rem] md:min-h-[42rem]",
  summer_venues: "min-h-[36rem] md:min-h-[40rem]",
  tours: "min-h-[32rem]",
  new_articles: "min-h-[28rem]",
  events: "min-h-[28rem]",
  new_movies: "min-h-[32rem] md:min-h-[36rem]",
  movies_week: "min-h-[26rem] md:min-h-[28rem]",
  coming_soon: "min-h-[32rem] md:min-h-[36rem]",
  dining: "min-h-[28rem]",
  newsletter: "min-h-[12rem]",
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
