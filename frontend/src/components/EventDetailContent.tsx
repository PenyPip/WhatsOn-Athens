import type { ReactNode } from "react";
import { ExternalLink, Globe, MapPin, Ticket } from "lucide-react";
import type { StrapiEvent } from "@/lib/api";
import { formatEventScheduleLine, formatEventTicketPrice } from "@/lib/eventLabels";
import { cn } from "@/lib/utils";

function DetailRow({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: ReactNode;
  variant?: "default" | "article-panel";
}) {
  if (value == null || value === "" || value === false) return null;

  const isPanel = variant === "article-panel";

  return (
    <tr
      className={cn(
        "border-b last:border-0",
        isPanel ? "border-[#13143E]/10 bg-white even:bg-[#13143E]/[0.025]" : "border-[#1C1D62]/8",
      )}
    >
      <th
        scope="row"
        className={cn(
          "font-article-ui align-top text-left font-bold uppercase tracking-[0.14em] text-[#7C2B76]",
          isPanel
            ? "w-[32%] min-w-[6.5rem] border-r border-[#13143E]/8 bg-[#13143E]/[0.04] px-4 py-3.5 text-[10px] sm:min-w-[7.5rem] sm:px-5"
            : "w-[34%] min-w-[7.5rem] py-2.5 pr-4 text-[10px] sm:py-3",
        )}
      >
        {label}
      </th>
      <td
        className={cn(
          "font-article align-top leading-relaxed text-[#13143E]",
          isPanel ? "px-4 py-3.5 text-sm sm:px-5 sm:text-[0.95rem]" : "py-2.5 text-sm sm:py-3 sm:text-[0.95rem]",
        )}
      >
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
  /** article-panel: πίνακας πληροφοριών κάτω από άρθρο — ξεχωριστό από το κείμενο. */
  variant?: "default" | "article-panel";
  className?: string;
};

export default function EventDetailContent({
  event,
  title,
  posterSize = "compact",
  variant = "default",
  className,
}: EventDetailContentProps) {
  const isArticlePanel = variant === "article-panel";
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
      : isArticlePanel
        ? "mx-auto w-full max-w-[9.5rem] shrink-0 sm:max-w-[10.5rem] md:mx-0"
        : "mx-auto w-full max-w-[11rem] shrink-0 md:mx-0";

  const infoTable = (
    <div
      className={cn(
        isArticlePanel &&
          "overflow-hidden rounded-xl border-2 border-[#13143E]/12 bg-white shadow-[0_4px_24px_rgba(19,20,62,0.08)]",
      )}
    >
      <table className="w-full border-collapse">
        <tbody>
          <DetailRow variant={variant} label="Πότε" value={schedule !== "—" ? schedule : null} />
          {hasWhere ? (
            <DetailRow
              variant={variant}
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
              variant={variant}
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
          {hasMeta ? <DetailRow variant={variant} label="Γλώσσα" value={event.languageSubtitles.trim()} /> : null}
        </tbody>
      </table>
    </div>
  );

  return (
    <div
      className={cn(
        isArticlePanel ? "flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6" : "flex flex-col gap-5 md:flex-row md:gap-6",
        className,
      )}
    >
      {event.posterUrl ? (
        <figure className={posterClass}>
          <img
            src={event.posterUrl}
            alt={title}
            className={cn(
              "aspect-[2/3] w-full object-cover",
              isArticlePanel
                ? "rounded-lg shadow-md ring-2 ring-[#13143E]/10"
                : "rounded-lg shadow-md ring-1 ring-[#1C1D62]/10",
            )}
            loading={posterSize === "hero" ? "eager" : "lazy"}
          />
        </figure>
      ) : null}

      <div className="min-w-0 flex-1 space-y-5">
        {isArticlePanel ? (
          <>
            {infoTable}
            {hasSynopsis ? (
              <div className="rounded-lg border border-[#13143E]/10 bg-[#13143E]/[0.03] px-4 py-3.5">
                <p className="font-article-ui text-[10px] font-bold uppercase tracking-[0.14em] text-[#7C2B76]">
                  Σύνοψη
                </p>
                {event.synopsisEl?.trim() ? (
                  <p className="mt-2 font-article text-sm leading-relaxed text-[#13143E]/90">
                    {event.synopsisEl.trim()}
                  </p>
                ) : null}
                {event.synopsisEn?.trim() ? (
                  <p className="mt-2 font-article text-sm italic leading-relaxed text-[#13143E]/70">
                    {event.synopsisEn.trim()}
                  </p>
                ) : null}
              </div>
            ) : null}
            {hasEditorial ? (
              <div className="rounded-lg border border-[#7C2B76]/25 bg-[#7C2B76]/[0.06] px-4 py-3.5">
                <p className="font-article-ui text-[10px] font-bold uppercase tracking-[0.14em] text-[#7C2B76]">
                  Editorial
                </p>
                {event.editorialNoteEl?.trim() ? (
                  <p className="mt-2 font-article text-sm leading-relaxed text-[#13143E]">
                    {event.editorialNoteEl.trim()}
                  </p>
                ) : null}
                {event.editorialNoteEn?.trim() ? (
                  <p className="mt-2 font-article text-sm italic leading-relaxed text-[#13143E]/75">
                    {event.editorialNoteEn.trim()}
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <>
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

            {infoTable}
          </>
        )}
      </div>
    </div>
  );
}
