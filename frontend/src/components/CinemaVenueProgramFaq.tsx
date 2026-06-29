import { cinemaVenueFaqEntries } from "@/lib/cinemaVenueProgramFaq";

export default function CinemaVenueProgramFaq({
  venueName,
  hasBookingLink,
  address,
}: {
  venueName: string;
  hasBookingLink?: boolean;
  address?: string | null;
}) {
  const entries = cinemaVenueFaqEntries(venueName, { hasBookingLink, address });
  if (!entries.length) return null;

  return (
    <section className="border-t border-border/40 bg-muted/15" aria-labelledby="venue-faq-heading">
      <div className="container py-8 md:py-10">
        <h2 id="venue-faq-heading" className="font-display text-lg font-semibold md:text-xl">
          Συχνές ερωτήσεις
        </h2>
        <dl className="mt-4 space-y-4">
          {entries.map((entry) => (
            <div key={entry.question} className="rounded-lg border border-border/40 bg-background/70 px-4 py-3">
              <dt className="font-body text-sm font-semibold text-foreground md:text-[0.9375rem]">{entry.question}</dt>
              <dd className="mt-1.5 font-body text-sm leading-relaxed text-muted-foreground md:text-[0.9375rem]">
                {entry.answer}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
