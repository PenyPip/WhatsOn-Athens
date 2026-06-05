import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import EventDetailContent from "@/components/EventDetailContent";
import Footer from "@/components/Footer";
import LoadingState from "@/components/LoadingState";
import SharePageButton from "@/components/SharePageButton";
import { useEventBySlug, useEvents } from "@/hooks/useStrapi";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";
import {
  eventDisplayTitle,
  eventPath,
  eventSecondaryTitle,
  eventTypeLabels,
  formatEventScheduleLine,
} from "@/lib/eventLabels";
import { truncateDescription } from "@/lib/siteMetadata";

export default function CulturalEventDetail() {
  const { slug } = useParams();
  const { data: event, isLoading } = useEventBySlug(slug ?? "");
  const { data: allEvents } = useEvents(Boolean(slug), 50);

  const title = event ? eventDisplayTitle(event) : "";
  const secondary = event ? eventSecondaryTitle(event) : undefined;

  usePageSeo(
    useMemo(() => {
      if (isLoading) return { title: "Event", enabled: false };
      if (!event) return { ...staticPageSeo.notFound, path: slug ? eventPath(slug) : "/events" };
      const desc =
        event.metaDescription?.trim() ||
        event.synopsisEl?.trim() ||
        event.synopsisEn?.trim() ||
        `${title} — ${eventTypeLabels[event.eventType]}.`;
      return {
        title,
        description: truncateDescription(desc),
        path: eventPath(event.slug),
        image: event.posterUrl,
        imageAlt: title,
        ogType: "article" as const,
      };
    }, [isLoading, event, slug, title]),
  );

  const moreEvents = useMemo(() => {
    if (!event || !allEvents?.length) return [];
    return allEvents.filter((e) => e.slug !== event.slug).slice(0, 3);
  }, [allEvents, event]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-36">
        <LoadingState />
      </div>
    );
  }

  if (!event || !title) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-36">
        <div className="text-center">
          <h1 className="mb-2 font-display text-2xl">Δεν βρέθηκε η εκδήλωση</h1>
          <Link to="/events" className="text-sm text-primary">
            Πίσω στα Events
          </Link>
        </div>
      </div>
    );
  }

  const typeLabel = eventTypeLabels[event.eventType] ?? eventTypeLabels.other;

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      <section className="relative overflow-hidden bg-[#13143E]">
        {event.posterUrl ? (
          <img
            src={event.posterUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-25"
            aria-hidden
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#13143E] via-[#13143E]/85 to-[#13143E]/60" />
        <div className="relative z-10 container pb-10 pt-32 md:pb-14 md:pt-36">
          <Link
            to="/events"
            className="mb-5 inline-flex items-center gap-1 text-sm text-white/55 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Πίσω στα Events
          </Link>
          <p className="font-article-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7C2B76]">
            {typeLabel}
            {event.featured ? <span className="ml-2 text-amber-200/90">· Featured</span> : null}
          </p>
          <h1 className="mt-3 max-w-3xl font-article text-3xl font-bold leading-tight text-white md:text-4xl lg:text-[2.75rem]">
            {title}
          </h1>
          {secondary ? (
            <p className="mt-2 max-w-2xl font-article text-lg italic text-white/80 md:text-xl">{secondary}</p>
          ) : null}
          <p className="font-article-ui mt-4 text-sm text-white/65">{formatEventScheduleLine(event)}</p>
          {event.tags.length > 0 ? (
            <p className="mt-3 text-sm text-white/55">{event.tags.join(" · ")}</p>
          ) : null}
          <div className="mt-6">
            <SharePageButton variant="hero" path={eventPath(event.slug)} title={title} />
          </div>
        </div>
      </section>

      <div className="container -mt-6 relative z-10 max-w-4xl">
        <div className="rounded-xl border border-[#1C1D62]/12 bg-white p-5 shadow-lg shadow-[#13143E]/8 md:p-8">
          <EventDetailContent event={event} title={title} posterSize="hero" />
        </div>
      </div>

      {moreEvents.length > 0 ? (
        <section className="container mt-14 max-w-4xl">
          <h2 className="font-display text-xl font-semibold text-[#13143E]">Άλλες εκδηλώσεις</h2>
          <ul className="mt-4 grid list-none gap-4 sm:grid-cols-3">
            {moreEvents.map((item) => (
              <li key={item.id}>
                <Link
                  to={eventPath(item.slug)}
                  className="group block rounded-lg border border-border/70 bg-card p-3 transition-colors hover:border-[#13143E]/20"
                >
                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      alt={eventDisplayTitle(item)}
                      className="mb-2 aspect-[3/2] w-full rounded-md object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {eventTypeLabels[item.eventType]}
                  </p>
                  <p className="mt-1 font-display text-sm font-semibold leading-snug group-hover:text-[#7C2B76]">
                    {eventDisplayTitle(item)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Footer />
    </div>
  );
}
