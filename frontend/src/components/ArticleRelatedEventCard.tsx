import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays } from "lucide-react";
import type { StrapiEvent } from "@/lib/api";
import EventDetailContent from "@/components/EventDetailContent";
import {
  eventDisplayTitle,
  eventPath,
  eventSecondaryTitle,
  eventTypeLabels,
  formatEventScheduleLine,
} from "@/lib/eventLabels";
import { cn } from "@/lib/utils";

type ArticleRelatedEventCardProps = {
  event: StrapiEvent;
  className?: string;
};

export default function ArticleRelatedEventCard({ event, className }: ArticleRelatedEventCardProps) {
  const title = eventDisplayTitle(event);
  if (!title) return null;

  const secondary = eventSecondaryTitle(event);
  const typeLabel = eventTypeLabels[event.eventType] ?? eventTypeLabels.other;
  const href = event.slug?.trim() ? eventPath(event.slug) : undefined;
  const schedule = formatEventScheduleLine(event);

  return (
    <aside
      className={cn("not-prose mt-14 w-full text-left", className)}
      aria-labelledby="article-related-event-heading"
    >
      <div className="mb-5 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#7C2B76]/35 to-[#13143E]/20" />
        <span className="font-article-ui shrink-0 rounded-full border border-[#7C2B76]/25 bg-[#7C2B76]/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7C2B76]">
          Πληροφορίες εκδήλωσης
        </span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#7C2B76]/35 to-[#13143E]/20" />
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-[#13143E]/14 shadow-[0_10px_40px_rgba(19,20,62,0.12)] ring-1 ring-[#7C2B76]/10">
        <div className="relative bg-[#13143E] px-5 py-5 md:px-7 md:py-6">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#7C2B76]/20 blur-2xl"
            aria-hidden
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-article-ui flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7C2B76]">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Σχετική εκδήλωση
              </p>
              {href ? (
                <Link
                  id="article-related-event-heading"
                  to={href}
                  className="mt-2 block font-article text-xl font-bold leading-snug text-white transition-colors hover:text-[#E8B4E0] md:text-2xl"
                >
                  {title}
                </Link>
              ) : (
                <h2
                  id="article-related-event-heading"
                  className="mt-2 font-article text-xl font-bold leading-snug text-white md:text-2xl"
                >
                  {title}
                </h2>
              )}
              {secondary ? (
                <p className="mt-1 font-article text-base italic text-white/75">{secondary}</p>
              ) : null}
            </div>
            <span className="font-article-ui shrink-0 rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/90">
              {typeLabel}
            </span>
          </div>
          {schedule !== "—" ? (
            <p className="font-article-ui relative mt-4 text-sm font-medium text-white/70">{schedule}</p>
          ) : null}
          {event.tags.length > 0 ? (
            <p className="relative mt-2 text-xs text-white/50">{event.tags.join(" · ")}</p>
          ) : null}
        </div>

        <div className="border-t border-[#13143E]/10 bg-gradient-to-b from-[#F5F3FA] to-white px-5 py-6 md:px-7 md:py-7">
          <EventDetailContent event={event} title={title} posterSize="compact" variant="article-panel" />

          {href ? (
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#13143E]/10 pt-5">
              <Link
                to={href}
                className="font-article-ui inline-flex items-center gap-2 rounded-lg bg-[#13143E] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1C1D62]"
              >
                Πλήρης σελίδα εκδήλωσης
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
              {event.ticketUrl?.trim() ? (
                <a
                  href={event.ticketUrl.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-article-ui inline-flex items-center gap-1.5 rounded-lg border-2 border-[#7C2B76]/35 bg-white px-4 py-2.5 text-sm font-semibold text-[#7C2B76] transition-colors hover:border-[#7C2B76] hover:bg-[#7C2B76]/[0.06]"
                >
                  Εισιτήρια
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
