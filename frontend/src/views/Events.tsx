import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageListHeader, { PAGE_LIST_SHELL_CLASS, PAGE_LIST_SUBTITLE_CLASS, PAGE_LIST_TITLE_CLASS } from "@/components/PageListHeader";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useEvents } from "@/hooks/useStrapi";
import { useSiteNow } from "@/hooks/useSiteNow";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";
import type { StrapiEvent, StrapiEventType } from "@/lib/api";
import {
  eventDisplayTitle,
  eventPath,
  eventSecondaryTitle,
  eventTypeLabels,
} from "@/lib/eventLabels";
import { splitEventsChronologically } from "@/lib/eventDateFilters";
import EventFreeBadge from "@/components/EventFreeBadge";
import EventWhenWhere from "@/components/EventWhenWhere";

const eventTypes = ["all", "cinema", "theater", "music", "art", "food", "other"] as const;
type EventFilterType = (typeof eventTypes)[number];

function EventGrid({ events }: { events: StrapiEvent[] }) {
  return (
    <ul className="grid list-none grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event, i) => {
        const title = eventDisplayTitle(event);
        const secondary = eventSecondaryTitle(event);
        return (
          <li
            key={`${event.id}-${event.slug}`}
            className="animate-stagger-in"
            style={{ ["--stagger" as string]: Math.min(i, 8) }}
          >
            <Link
              to={eventPath(event.slug)}
              className="group flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card transition-all hover:border-[#13143E]/25 hover:shadow-[0_8px_28px_rgba(28,29,98,0.1)]"
            >
              {event.posterUrl ? (
                <img
                  src={event.posterUrl}
                  alt={title}
                  className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  loading="lazy"
                />
              ) : (
                <div className="aspect-[16/10] w-full bg-gradient-to-br from-[#13143E]/10 to-[#7C2B76]/15" />
              )}
              <div className="flex flex-1 flex-col p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {eventTypeLabels[event.eventType]}
                    {event.featured ? <span className="ml-2 text-[#7C2B76]">· Featured</span> : null}
                  </p>
                  <EventFreeBadge event={event} />
                </div>
                <EventWhenWhere event={event} className="mt-2" />
                <h2 className="mt-2 font-display text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-[#7C2B76]">
                  {title}
                </h2>
                {secondary ? (
                  <p className="mt-0.5 text-sm italic text-muted-foreground">{secondary}</p>
                ) : null}
                {event.synopsisEl ? (
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {event.synopsisEl}
                  </p>
                ) : null}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function Events() {
  usePageSeo(staticPageSeo.events);
  const siteNow = useSiteNow();
  const { data: events, isLoading } = useEvents(true, 200);
  const [filter, setFilter] = useState<EventFilterType>("all");

  const { upcoming, past } = useMemo(() => {
    const list = events ?? [];
    const scoped = filter === "all" ? list : list.filter((e) => e.eventType === filter);
    return splitEventsChronologically(scoped, siteNow);
  }, [events, filter, siteNow]);

  return (
    <div className={PAGE_LIST_SHELL_CLASS}>
      <PageListHeader>
        <h1 className={PAGE_LIST_TITLE_CLASS}>Events</h1>
        <p className={PAGE_LIST_SUBTITLE_CLASS}>
          Πολιτιστικές εκδηλώσεις στην Αθήνα - κινηματογράφος, θέατρο, μουσική, τέχνη και περισσότερα.
        </p>
      </PageListHeader>

      <div className="container">
        <div className="font-article-ui mb-8 flex flex-wrap items-center gap-2">
          {eventTypes.map((type) => {
            const active = filter === type;
            const label = type === "all" ? "Όλα" : eventTypeLabels[type as StrapiEventType];
            return (
              <button
                key={type}
                type="button"
                onClick={() => setFilter(type)}
                className={`rounded px-4 py-1.5 text-sm font-medium transition-all border ${
                  active
                    ? "bg-[#13143E] text-white border-[#13143E]"
                    : "bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <LoadingState message="Φόρτωση events..." />
        ) : upcoming.length === 0 && past.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">Δεν βρέθηκαν εκδηλώσεις.</p>
        ) : (
          <div className="space-y-12">
            {upcoming.length > 0 ? <EventGrid events={upcoming} /> : null}
            {past.length > 0 ? (
              <details className="group border-t border-border pt-6">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-display text-lg font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
                  <span className="text-xs transition-transform group-open:rotate-90" aria-hidden>
                    ▸
                  </span>
                  Αρχείο
                  <span className="text-sm font-normal">{past.length}</span>
                </summary>
                <div className="mt-6 opacity-80">
                  <EventGrid events={past} />
                </div>
              </details>
            ) : null}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
