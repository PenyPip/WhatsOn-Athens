import { Link } from "react-router-dom";
import PosterPicture from "@/components/PosterPicture";
import ShowtimesExpandable from "@/components/ShowtimesExpandable";
import ScheduleCompactRow from "@/components/ScheduleCompactRow";
import VenueBookingLink from "@/components/VenueBookingLink";
import type { StrapiTheaterPerformance, StrapiTheaterShow, StrapiVenue } from "@/lib/api";
import { groupPerformancesByShowAtVenue } from "@/lib/theaterPerformances";
import { resolveTheaterTicketPrices, theaterPriceLabel } from "@/lib/theaterPricing";
import { theaterGenreLabel } from "@/lib/theaterGenre";
import { isValidExternalUrl } from "@/lib/venueResolve";
import { useMemo } from "react";

function performancePriceLabel(
  p: StrapiTheaterPerformance,
  show?: StrapiTheaterShow,
): string | null {
  if (p.soldOut || show?.soldOut) return null;
  if (p.price != null && Number.isFinite(p.price)) {
    const rounded = Math.round(p.price * 100) / 100;
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2).replace(/\.?0+$/, "")}€`;
  }
  if (show) return theaterPriceLabel(resolveTheaterTicketPrices(show));
  return null;
}

export default function TheaterVenueProgramLayout({
  performances,
  venue,
  showsBySlug,
}: {
  performances: StrapiTheaterPerformance[];
  venue?: StrapiVenue;
  showsBySlug?: Map<string, StrapiTheaterShow>;
}) {
  const groups = useMemo(() => groupPerformancesByShowAtVenue(performances), [performances]);

  if (!groups.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Δεν υπάρχουν επερχόμενες παραστάσεις σε αυτόν τον χώρο.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/15 bg-muted/20 p-4 ring-1 ring-border/[0.06] md:p-5">
        <h2 className="font-display mb-1 text-lg font-semibold text-[#13143E] md:text-2xl">
          Τι παίζει
        </h2>
        <p className="mb-5 text-xs text-muted-foreground md:text-sm">
          {groups.length} {groups.length === 1 ? "παράσταση" : "παραστάσεις"} με επερχόμενες εμφανίσεις
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {groups.map((group) => {
            const show = group.theaterShowSlug
              ? showsBySlug?.get(group.theaterShowSlug)
              : undefined;
            const detailHref = group.theaterShowSlug
              ? `/theater/${encodeURIComponent(group.theaterShowSlug)}`
              : null;
            const title = show?.title?.trim() || group.theaterShowTitle;
            const posterUrl = show?.posterUrl ?? group.posterUrl ?? undefined;
            const genre = show ? theaterGenreLabel(show.genre) : "";
            const soldOut = Boolean(show?.soldOut || group.soldOut);

            return (
              <article
                key={group.key}
                className="flex min-h-0 flex-col rounded-lg border border-border/80 bg-card/50 p-3 sm:p-4"
              >
                <div className="mb-3 flex gap-3 border-b border-border/60 pb-3">
                  {posterUrl ? (
                    <div className="h-24 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                      <PosterPicture
                        src={posterUrl}
                        alt=""
                        aria-hidden
                        className="h-full w-full object-cover"
                        sizes="64px"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    {detailHref ? (
                      <Link
                        to={detailHref}
                        className="font-display text-base font-semibold leading-snug text-[#13143E] hover:underline"
                      >
                        {title}
                      </Link>
                    ) : (
                      <h3 className="font-display text-base font-semibold leading-snug text-[#13143E]">
                        {title}
                      </h3>
                    )}
                    {show?.director?.trim() ? (
                      <p className="mt-1 text-xs text-muted-foreground">{show.director.trim()}</p>
                    ) : null}
                    {genre ? (
                      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {genre}
                      </p>
                    ) : null}
                    {soldOut ? (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-destructive">
                        Sold out
                      </p>
                    ) : null}
                  </div>
                </div>
                <ShowtimesExpandable listClassName="min-h-0 flex-1">
                  {group.slots.map((p) => (
                    <ScheduleCompactRow
                      key={p.id}
                      slot={p}
                      hallName={p.hallName}
                      priceLabel={performancePriceLabel(p, show)}
                      soldOut={Boolean(p.soldOut || soldOut)}
                      emphasized
                    />
                  ))}
                </ShowtimesExpandable>
                {detailHref ? (
                  <div className="mt-3 border-t border-border/50 pt-2">
                    <Link
                      to={detailHref}
                      className="text-sm font-medium text-[#13143E] underline decoration-[#13143E]/30 underline-offset-2 hover:decoration-[#13143E]/60"
                    >
                      Λεπτομέρειες παράστασης
                    </Link>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
        {venue && isValidExternalUrl(venue.moreLink) ? (
          <div className="mt-5 border-t border-border/50 pt-4">
            <VenueBookingLink venue={venue} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
