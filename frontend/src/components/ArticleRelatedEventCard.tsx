import { Link } from "react-router-dom";
import type { StrapiEvent } from "@/lib/api";
import EventDetailContent from "@/components/EventDetailContent";
import {
  eventDisplayTitle,
  eventPath,
  eventSecondaryTitle,
  eventTypeLabels,
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

  return (
    <aside
      className={cn(
        "mt-12 w-full overflow-hidden rounded-xl border border-[#1C1D62]/12 bg-[#F0EDF8]/40 text-left",
        className,
      )}
      aria-labelledby="article-related-event-heading"
    >
      <div className="border-b border-[#1C1D62]/10 bg-white/60 px-5 py-4 md:px-6">
        <p className="font-article-ui text-[10px] font-bold uppercase tracking-[0.18em] text-[#7C2B76]">
          Σχετική εκδήλωση
        </p>
        {href ? (
          <Link
            id="article-related-event-heading"
            to={href}
            className="mt-2 block font-article text-xl font-bold leading-snug text-[#13143E] transition-colors hover:text-[#7C2B76] md:text-2xl"
          >
            {title}
          </Link>
        ) : (
          <h2
            id="article-related-event-heading"
            className="mt-2 font-article text-xl font-bold leading-snug text-[#13143E] md:text-2xl"
          >
            {title}
          </h2>
        )}
        {secondary ? (
          <p className="mt-1 font-article text-base italic text-[#13143E]/75">{secondary}</p>
        ) : null}
        <p className="font-article-ui mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1C1D62]/55">
          {typeLabel}
          {event.tags.length > 0 ? (
            <span className="font-normal normal-case tracking-normal text-[#1C1D62]/45">
              {" "}
              · {event.tags.join(" · ")}
            </span>
          ) : null}
        </p>
        {href ? (
          <p className="mt-3">
            <Link
              to={href}
              className="font-article-ui text-xs font-semibold text-[#7C2B76] underline underline-offset-2 hover:text-[#13143E]"
            >
              Πλήρης σελίδα εκδήλωσης →
            </Link>
          </p>
        ) : null}
      </div>

      <div className="p-5 md:p-6">
        <EventDetailContent event={event} title={title} posterSize="compact" />
      </div>
    </aside>
  );
}
