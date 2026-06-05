import type { ReactNode } from "react";
import { ExternalLink, Globe, MapPin, Ticket } from "lucide-react";
import type { StrapiEvent } from "@/lib/api";
import { formatEventScheduleLine, formatEventTicketPrice } from "@/lib/eventLabels";
import { cn } from "@/lib/utils";

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === "" || value === false) return null;
  return (
    <tr className="border-b border-[#1C1D62]/8 last:border-0">
      <th
        scope="row"
        className="font-article-ui w-[34%] min-w-[7.5rem] align-top py-2.5 pr-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-[#7C2B76] sm:py-3"
      >
        {label}
      </th>
      <td className="font-article align-top py-2.5 text-sm leading-relaxed text-[#13143E] sm:py-3 sm:text-[0.95rem]">
        {value}
      </td>
    </tr>
  );
}

function ExternalHref({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-[#7C2B76] underline underline-offset-2 transition-colors hover:text-[#13143E]"
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
    </a>
  );
}

type EventDetailContentProps = {
  event: StrapiEvent;
  title: string;
  /** Μέγεθος αφίσας: compact (άρθρο), hero (σελίδα event). */
  posterSize?: "compact" | "hero";
  className?: string;
};

export default function EventDetailContent({
  event,
  title,
  posterSize = "compact",
  className,
}: EventDetailContentProps) {
  const schedule = formatEventScheduleLine(event);
  const priceLabel = formatEventTicketPrice(event.ticketPrice);
  const venue = event.venue;
  const hasWhere = Boolean(venue?.name?.trim() || event.onlineLink?.trim());
  const hasTickets = Boolean(priceLabel || event.ticketUrl?.trim());
  const hasMeta = Boolean(event.languageSubtitles?.trim());
  const hasSynopsis = Boolean(event.synopsisEl?.trim() || event.synopsisEn?.trim());
  const hasEditorial = Boolean(event.editorialNoteEl?.trim() || event.editorialNoteEn?.trim());

  const posterClass =
    posterSize === "hero"
      ? "mx-auto w-full max-w-[14rem] shrink-0 sm:max-w-[16rem] md:mx-0 lg:max-w-[18rem]"
      : "mx-auto w-full max-w-[11rem] shrink-0 md:mx-0";

  return (
    <div className={cn("flex flex-col gap-5 md:flex-row md:gap-6", className)}>
      {event.posterUrl ? (
        <figure className={posterClass}>
          <img
            src={event.posterUrl}
            alt={title}
            className="aspect-[2/3] w-full rounded-lg object-cover shadow-md ring-1 ring-[#1C1D62]/10"
            loading={posterSize === "hero" ? "eager" : "lazy"}
          />
        </figure>
      ) : null}

      <div className="min-w-0 flex-1 space-y-5">
        {hasSynopsis ? (
          <div>
            <p className="font-article-ui text-[10px] font-bold uppercase tracking-[0.14em] text-[#7C2B76]">
              Σύνοψη
            </p>
            {event.synopsisEl?.trim() ? (
              <p className="mt-2 font-article text-sm leading-relaxed text-[#13143E]/90 md:text-base">
                {event.synopsisEl.trim()}
              </p>
            ) : null}
            {event.synopsisEn?.trim() ? (
              <p className="mt-2 font-article text-sm italic leading-relaxed text-[#13143E]/70 md:text-base">
                {event.synopsisEn.trim()}
              </p>
            ) : null}
          </div>
        ) : null}

        {hasEditorial ? (
          <div className="rounded-lg border border-[#7C2B76]/20 bg-white/70 px-4 py-3">
            <p className="font-article-ui text-[10px] font-bold uppercase tracking-[0.14em] text-[#7C2B76]">
              Editorial
            </p>
            {event.editorialNoteEl?.trim() ? (
              <p className="mt-2 font-article text-sm leading-relaxed text-[#13143E] md:text-base">
                {event.editorialNoteEl.trim()}
              </p>
            ) : null}
            {event.editorialNoteEn?.trim() ? (
              <p className="mt-2 font-article text-sm italic leading-relaxed text-[#13143E]/75 md:text-base">
                {event.editorialNoteEn.trim()}
              </p>
            ) : null}
          </div>
        ) : null}

        <table className="w-full border-collapse">
          <tbody>
            <DetailRow label="Πότε" value={schedule !== "—" ? schedule : null} />
            {hasWhere ? (
              <DetailRow
                label="Πού"
                value={
                  <div className="space-y-2">
                    {venue?.name?.trim() ? (
                      <p className="flex items-start gap-1.5 font-medium">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#7C2B76]" aria-hidden />
                        <span>
                          {venue.name.trim()}
                          {venue.address?.trim() ? (
                            <span className="mt-0.5 block font-normal text-[#13143E]/75">{venue.address.trim()}</span>
                          ) : null}
                        </span>
                      </p>
                    ) : null}
                    {venue?.googleMapsUrl?.trim() ? (
                      <ExternalHref href={venue.googleMapsUrl.trim()}>Χάρτης</ExternalHref>
                    ) : null}
                    {event.onlineLink?.trim() ? (
                      <p className="flex items-center gap-1.5">
                        <Globe className="h-4 w-4 shrink-0 text-[#7C2B76]" aria-hidden />
                        <ExternalHref href={event.onlineLink.trim()}>Online</ExternalHref>
                      </p>
                    ) : null}
                  </div>
                }
              />
            ) : null}
            {hasTickets ? (
              <DetailRow
                label="Εισιτήρια"
                value={
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {priceLabel ? (
                      <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                        <Ticket className="h-4 w-4 text-[#7C2B76]" aria-hidden />
                        {priceLabel}
                      </span>
                    ) : null}
                    {event.ticketUrl?.trim() ? (
                      <ExternalHref href={event.ticketUrl.trim()}>Κράτηση / αγορά</ExternalHref>
                    ) : null}
                  </div>
                }
              />
            ) : null}
            {hasMeta ? <DetailRow label="Γλώσσα" value={event.languageSubtitles.trim()} /> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
