import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ExternalLink, MapPin } from "lucide-react";
import Footer from "@/components/Footer";
import LoadingState from "@/components/LoadingState";
import CinemaVenueProgramIntro from "@/components/CinemaVenueProgramIntro";
import PageListHeader, { PAGE_LIST_SHELL_CLASS, PAGE_LIST_TITLE_CLASS } from "@/components/PageListHeader";
import TheaterVenueProgramLayout from "@/components/TheaterVenueProgramLayout";
import {
  useTheaterPerformances,
  useTheaterShows,
  useVenueBySlug,
  useVenuesForProgram,
} from "@/hooks/useStrapi";
import { usePageSeo } from "@/hooks/usePageSeo";
import { theaterVenueProgramSeo } from "@/lib/theaterVenueProgramSeo";
import { theaterVenueProgramPath } from "@/lib/theaterVenuePath";
import {
  findVenueByProgramSlug,
  resolveGoogleMapsHref,
  venueFromPerformancesBySlug,
} from "@/lib/venueResolve";
import { isTheaterVenue } from "@/lib/venueType";

const cityLabels: Record<string, string> = {
  athens: "Αθήνα",
  thessaloniki: "Θεσσαλονίκη",
  other: "Άλλο",
};

function venueCityLabel(v: { city?: string }): string {
  const c = typeof v.city === "string" ? v.city.trim().toLowerCase() : "";
  return cityLabels[c] ?? v.city ?? "";
}

const TheaterVenueProgram = () => {
  const navigate = useNavigate();
  const { venueSlug: routeVenueSlug } = useParams<{ venueSlug?: string }>();
  const venueSlug = routeVenueSlug?.trim() ?? "";

  const { data: venues, isLoading: venuesLoading } = useVenuesForProgram();
  const { data: performances, isLoading: performancesLoading } = useTheaterPerformances(
    Boolean(venueSlug),
    venueSlug || undefined,
  );
  const { data: theaterShows } = useTheaterShows(Boolean(venueSlug));

  const venueInList = useMemo(
    () => (venueSlug && venues?.length ? findVenueByProgramSlug(venues, venueSlug) : null),
    [venueSlug, venues],
  );
  const venueFromPerformances = useMemo(
    () =>
      venueSlug && performances?.length ? venueFromPerformancesBySlug(performances, venueSlug) : null,
    [venueSlug, performances],
  );
  const needsVenueFetch = Boolean(venueSlug) && !venueInList && !venueFromPerformances && !venuesLoading;
  const { data: venueFetched, isLoading: venueFetchedLoading } = useVenueBySlug(
    venueSlug || undefined,
    needsVenueFetch,
  );

  const venue = useMemo(() => {
    if (!venueSlug) return null;
    return venueInList ?? venueFromPerformances ?? venueFetched ?? null;
  }, [venueSlug, venueInList, venueFromPerformances, venueFetched]);

  const venueLookupPending =
    Boolean(venueSlug) && !venue && (venuesLoading || performancesLoading || (needsVenueFetch && venueFetchedLoading));

  const showsBySlug = useMemo(() => {
    const m = new Map<string, NonNullable<typeof theaterShows>[number]>();
    for (const show of theaterShows ?? []) {
      if (show.slug?.trim()) m.set(show.slug.trim(), show);
    }
    return m;
  }, [theaterShows]);

  const canonicalPath = venue?.slug ? theaterVenueProgramPath(venue.slug) : theaterVenueProgramPath(venueSlug);

  const listSeo = useMemo(() => {
    if (!venue) {
      return {
        title: "Πρόγραμμα θεάτρου",
        description: "Πρόγραμμα θεατρικού χώρου.",
        h1: "Πρόγραμμα θεάτρου",
      };
    }
    const s = theaterVenueProgramSeo(venue);
    return {
      title: s.title,
      description: s.description,
      h1: s.h1,
      subtitle: s.subtitle,
      intro: s.intro,
      ogTitle: s.ogTitle,
      ogDescription: s.ogDescription,
    };
  }, [venue]);

  usePageSeo({
    title: listSeo.title,
    description: listSeo.description,
    ogTitle: listSeo.ogTitle,
    ogDescription: listSeo.ogDescription,
    path: canonicalPath,
    canonicalPath,
  });

  const wrongVenueType = venue && !isTheaterVenue(venue);

  return (
    <div className={PAGE_LIST_SHELL_CLASS}>
      <PageListHeader>
            <div className="mb-3">
              <Link
                to="/theater"
                className="text-sm text-white/55 transition-colors hover:text-white/85"
              >
                ← Θέατρο
              </Link>
            </div>
            <h1 className={PAGE_LIST_TITLE_CLASS}>{listSeo.h1}</h1>
            {venue && "subtitle" in listSeo && listSeo.subtitle ? (
              <p className="mt-2 text-sm text-white/70 md:text-base">{listSeo.subtitle}</p>
            ) : null}
            {venue ? (
              <div className="mt-3 space-y-1.5 text-sm text-white/75 md:mt-4">
                {venue.address?.trim() ? (
                  <p className="flex items-start gap-2 max-w-2xl">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/45" aria-hidden />
                    {(() => {
                      const mapsHref = resolveGoogleMapsHref(venue.googleMapsUrl, venue.address);
                      return mapsHref ? (
                        <a
                          href={mapsHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex flex-wrap items-center gap-1 underline decoration-white/25 underline-offset-2 hover:text-white hover:decoration-white/50"
                        >
                          <span>{venue.address.trim()}</span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                          <span className="sr-only"> (χάρτης)</span>
                        </a>
                      ) : (
                        <span>{venue.address.trim()}</span>
                      );
                    })()}
                  </p>
                ) : null}
                {venueCityLabel(venue) ? (
                  <p className="pl-6 text-xs font-medium uppercase tracking-wide text-white/50 md:text-sm">
                    {venueCityLabel(venue)}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-white/60 md:text-base">Επερχόμενες παραστάσεις ανά χώρο</p>
            )}
      </PageListHeader>

      {venue && "intro" in listSeo && listSeo.intro ? (
        <CinemaVenueProgramIntro venueName={venue.name} intro={listSeo.intro} />
      ) : null}

      <div className="container">
        {venueSlug && !venue && !venueLookupPending ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-950/[0.09] px-4 py-3.5 ring-1 ring-amber-600/18">
            <p className="text-sm text-amber-100/90">
              Ο σύνδεσμος χώρου δεν αντιστοιχεί σε καταχωρημένο θέατρο (
              <code className="text-amber-50/90">/theater/venue/{venueSlug}</code>).
            </p>
            <button
              type="button"
              onClick={() => navigate("/theater")}
              className="shrink-0 rounded-lg bg-black/35 px-3 py-2 text-sm font-medium text-amber-50 shadow-none ring-1 ring-amber-500/25 transition-colors hover:bg-black/55"
            >
              Επαναφορά
            </button>
          </div>
        ) : null}

        {wrongVenueType ? (
          <p className="mb-6 text-sm text-muted-foreground">
            Αυτός ο χώρος δεν είναι θέατρο.{" "}
            <Link to="/venues" className="font-medium text-[#13143E] underline">
              Όλοι οι χώροι
            </Link>
          </p>
        ) : null}

        {venueLookupPending || (performances === undefined && performancesLoading) ? (
          <LoadingState message="Φόρτωση προγράμματος…" />
        ) : venue && !wrongVenueType ? (
          <TheaterVenueProgramLayout
            performances={performances ?? []}
            venue={venue}
            showsBySlug={showsBySlug}
          />
        ) : null}
      </div>
      <Footer />
    </div>
  );
};

export default TheaterVenueProgram;
