import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeaderReveal from "@/components/PageHeaderReveal";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import { useEvents } from "@/hooks/useStrapi";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";
import type { StrapiEventType } from "@/lib/api";
import {
  eventDisplayTitle,
  eventPath,
  eventSecondaryTitle,
  eventTypeLabels,
  formatEventScheduleLine,
} from "@/lib/eventLabels";

const eventTypes = ["all", "cinema", "theater", "music", "art", "food", "other"] as const;
type EventFilterType = (typeof eventTypes)[number];

export default function Events() {
  usePageSeo(staticPageSeo.events);
  const { data: events, isLoading } = useEvents(true, 200);
  const [filter, setFilter] = useState<EventFilterType>("all");

  const filtered = useMemo(() => {
    const list = [...(events ?? [])].sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return (a.startDate || "").localeCompare(b.startDate || "");
    });
    if (filter === "all") return list;
    return list.filter((e) => e.eventType === filter);
  }, [events, filter]);

  return (
    <div className="min-h-screen pt-36 pb-20 md:pb-8">
      <div className="section-black py-10 -mt-28 pt-36 mb-8">
        <div className="container">
          <PageHeaderReveal>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">Events</h1>
            <p className="text-white/60 text-base">
              Πολιτιστικές εκδηλώσεις στην Αθήνα — κινηματογράφος, θέατρο, μουσική, τέχνη και περισσότερα.
            </p>
          </PageHeaderReveal>
        </div>
      </div>

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
        ) : filtered.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">Δεν βρέθηκαν εκδηλώσεις.</p>
        ) : (
          <ul className="grid list-none grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((event, i) => {
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
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {eventTypeLabels[event.eventType]}
                        {event.featured ? <span className="ml-2 text-[#7C2B76]">· Featured</span> : null}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatEventScheduleLine(event)}</p>
                      <h2 className="mt-2 font-display text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-[#7C2B76]">
                        {title}
                      </h2>
                      {secondary ? (
                        <p className="mt-0.5 text-sm italic text-muted-foreground">{secondary}</p>
                      ) : null}
                      {event.venue?.name ? (
                        <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">{event.venue.name}</p>
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
        )}
      </div>

      <Footer />
    </div>
  );
}
