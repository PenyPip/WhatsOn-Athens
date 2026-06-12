/** Crawlable κείμενο κάτω από το hero — πρόγραμμα σινεμά (on-page SEO). */
export default function CinemaVenueProgramIntro({
  venueName,
  intro,
}: {
  venueName: string;
  intro: string;
}) {
  return (
    <section
      className="border-b border-white/10 bg-background"
      aria-label={`Πρόγραμμα ${venueName}`}
    >
      <div className="container py-4 md:py-5">
        <p className="max-w-3xl font-body text-sm leading-relaxed text-muted-foreground md:text-[0.9375rem]">
          {intro}
        </p>
      </div>
    </section>
  );
}
