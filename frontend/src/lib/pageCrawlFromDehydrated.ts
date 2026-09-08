import type { DehydratedState } from "@tanstack/react-query";
import type {
  StrapiArticle,
  StrapiEditorialReview,
  StrapiEvent,
  StrapiRestaurant,
  StrapiShowtime,
  StrapiTheaterShow,
  StrapiVenue,
} from "@/lib/api";
import {
  crawlEnrichment,
  crawlEntityByPath,
  crawlSeoCopyForPath,
  crawlVenueByProgramPath,
  crawlVenueByTheaterProgramPath,
} from "@/lib/crawlEnrichment";
import type { SeoCrawlLink, SeoCrawlSnapshot } from "@/lib/crawlTypes";
import { buildDetailCrawlFromDehydrated } from "@/lib/detailCrawlFromDehydrated";
import { buildHomeCrawlFromDehydrated } from "@/lib/homeCrawlFromDehydrated";
import { buildMoviesListCrawlFromDehydrated } from "@/lib/moviesListCrawlFromDehydrated";
import { eventDisplayTitle, eventPath } from "@/lib/eventLabels";
import { seoCopyForPath } from "@/lib/jsonLdPage";
import { moviesVenueProgramPath } from "@/lib/moviesVenuePath";
import { staticPageSeo } from "@/lib/pageSeoCopy";
import { synopsisExcerpt } from "@/lib/synopsisExcerpt";
import { isKidsTheaterShow, isTheaterKidsPath } from "@/lib/theaterKids";
import { theaterVenueProgramPath } from "@/lib/theaterVenuePath";

const LINK_CAP = 48;

function queryData<T>(state: DehydratedState, match: (key: unknown[]) => boolean): T | undefined {
  const entry = state.queries.find(
    (q) => Array.isArray(q.queryKey) && match(q.queryKey as unknown[]) && q.state.status === "success",
  );
  if (!entry) return undefined;
  return entry.state.data as T;
}

function uniqueLinks(rows: SeoCrawlLink[], limit = LINK_CAP): SeoCrawlLink[] {
  const seen = new Set<string>();
  const out: SeoCrawlLink[] = [];
  for (const row of rows) {
    const href = row.href.trim();
    const title = row.title.trim();
    if (!href || !title || seen.has(href)) continue;
    seen.add(href);
    out.push({ href, title });
    if (out.length >= limit) break;
  }
  return out;
}

function listShell(h1: string, intro: string, links: SeoCrawlLink[]): SeoCrawlSnapshot {
  return { kind: "list", h1, intro, links: uniqueLinks(links) };
}

function detailShell(
  h1: string,
  intro: string,
  opts?: {
    body?: string;
    scheduleHeading?: string;
    schedule?: SeoCrawlSnapshot["schedule"];
    href?: string;
  },
): SeoCrawlSnapshot {
  return {
    kind: "detail",
    h1,
    intro,
    links: opts?.href ? [{ href: opts.href, title: h1 }] : [],
    body: opts?.body,
    scheduleHeading: opts?.scheduleHeading,
    schedule: opts?.schedule,
  };
}

/** Όλες οι δημόσιες σελίδες εκτός noindex (/profile). Ποτέ null για indexable path. */
export function buildSeoCrawlForPath(path: string, state: DehydratedState): SeoCrawlSnapshot | null {
  const normalized = path === "" ? "/" : path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/profile") return null;

  if (normalized === "/") {
    const home = buildHomeCrawlFromDehydrated(state);
    if (!home) {
      const seo = staticPageSeo.home;
      return listShell(seo.h1, seo.description, []);
    }
    return {
      kind: "home",
      h1: staticPageSeo.home.h1,
      intro: staticPageSeo.home.description,
      links: uniqueLinks([
        ...home.today.map((m) => ({ href: m.href, title: m.title })),
        ...home.week.map((m) => ({ href: m.href, title: m.title })),
        ...home.summer.map((m) => ({ href: m.href, title: m.title })),
        ...home.summerVenues.map((v) => ({ href: v.href, title: v.name })),
      ]),
      home,
    };
  }

  const moviesList = buildMoviesListCrawlFromDehydrated(normalized, state);
  if (moviesList) {
    return listShell(
      moviesList.h1,
      moviesList.intro,
      moviesList.movies.map((m) => ({ href: m.href, title: m.title })),
    );
  }

  const detail = buildDetailCrawlFromDehydrated(normalized, state);
  if (detail) {
    const seo = seoCopyForPath(normalized);
    return detailShell(detail.h1, detail.synopsis || seo.description, {
      body: detail.synopsis || undefined,
      scheduleHeading: detail.scheduleHeading,
      schedule: detail.schedule.map((s) => ({ label: s.label })),
      href: detail.href,
    });
  }

  if (normalized === "/theater" || isTheaterKidsPath(normalized)) {
    const kidsOnly = isTheaterKidsPath(normalized);
    const seo = kidsOnly ? staticPageSeo.theaterKids : staticPageSeo.theater;
    const shows = queryData<StrapiTheaterShow[]>(state, (k) => k[0] === "theaterShows") ?? [];
    const fromRq = shows
      .filter((s) => (kidsOnly ? isKidsTheaterShow(s) : !isKidsTheaterShow(s)))
      .map((s) => ({ href: `/theater/${s.slug}`, title: s.title }));
    const fromEnrichment = (crawlEnrichment.theaterShows ?? []).map((s) => ({
      href: s.path,
      title: s.title,
    }));
    return listShell(seo.title, seo.description, fromRq.length ? fromRq : fromEnrichment);
  }

  if (normalized === "/venues") {
    const venues = queryData<StrapiVenue[]>(state, (k) => k[0] === "venues") ?? [];
    const fromRq = venues.map((v) => ({
      href: v.type === "theater" ? theaterVenueProgramPath(v.slug) : moviesVenueProgramPath(v.slug),
      title: v.name,
    }));
    const fromEnrichment = crawlEnrichment.venues.map((v) => ({
      href: v.moviesHref || v.venuesHref || `/movies/venue/${v.slug}`,
      title: v.name,
    }));
    return listShell(
      staticPageSeo.venues.title,
      staticPageSeo.venues.description,
      fromRq.length ? fromRq : fromEnrichment,
    );
  }

  const cinemaVenue = crawlVenueByProgramPath(normalized);
  if (cinemaVenue) {
    const showtimes = queryData<StrapiShowtime[]>(state, (k) => k[0] === "showtimes") ?? [];
    const titles = new Map<string, string>();
    for (const st of showtimes) {
      const slug = st.movieSlug?.trim();
      const title = st.movieTitle?.trim();
      if (slug && title) titles.set(slug, title);
    }
    const links = [...titles.entries()].map(([slug, title]) => ({
      href: `/movies/${slug}`,
      title,
    }));
    const seo = crawlSeoCopyForPath(normalized);
    return listShell(
      seo?.title ?? cinemaVenue.name,
      seo?.description ?? `Πρόγραμμα προβολών στο ${cinemaVenue.name}.`,
      links,
    );
  }

  const theaterVenue = crawlVenueByTheaterProgramPath(normalized);
  if (theaterVenue) {
    const seo = crawlSeoCopyForPath(normalized);
    const shows = queryData<StrapiTheaterShow[]>(state, (k) => k[0] === "theaterShows") ?? [];
    const links = shows.map((s) => ({ href: `/theater/${s.slug}`, title: s.title }));
    return listShell(
      seo?.title ?? theaterVenue.name,
      seo?.description ?? `Πρόγραμμα παραστάσεων στο ${theaterVenue.name}.`,
      links.length ? links : (crawlEnrichment.theaterShows ?? []).map((s) => ({ href: s.path, title: s.title })),
    );
  }

  if (normalized === "/dining") {
    const restaurants = queryData<StrapiRestaurant[]>(state, (k) => k[0] === "restaurants") ?? [];
    const fromRq = restaurants.map((r) => ({ href: `/dining/${r.slug}`, title: r.name }));
    const fromEnrichment = (crawlEnrichment.restaurants ?? []).map((r) => ({
      href: r.path,
      title: r.title,
    }));
    return listShell(
      staticPageSeo.dining.title,
      staticPageSeo.dining.description,
      fromRq.length ? fromRq : fromEnrichment,
    );
  }

  if (normalized.startsWith("/dining/")) {
    const slug = normalized.slice("/dining/".length);
    const restaurant =
      queryData<StrapiRestaurant>(state, (k) => k[0] === "restaurant" && k[1] === slug) ?? null;
    const hit = crawlEntityByPath(normalized);
    const title = restaurant?.name?.trim() || (hit?.kind === "restaurant" ? hit.entity.title : slug);
    const body = synopsisExcerpt(restaurant?.synopsis ?? "", 400);
    const seo = crawlSeoCopyForPath(normalized);
    return detailShell(title, seo?.description || body || staticPageSeo.dining.description, {
      body: body || undefined,
      href: normalized,
    });
  }

  if (normalized === "/reviews") {
    const reviews = queryData<StrapiEditorialReview[]>(state, (k) => k[0] === "editorialReviews") ?? [];
    const fromRq = reviews.map((r) => ({
      href: `/reviews/${r.slug}`,
      title: r.title?.trim() || r.slug,
    }));
    const fromEnrichment = (crawlEnrichment.reviews ?? []).map((r) => ({ href: r.path, title: r.title }));
    return listShell(
      staticPageSeo.reviews.title,
      staticPageSeo.reviews.description,
      fromRq.length ? fromRq : fromEnrichment,
    );
  }

  if (normalized.startsWith("/reviews/")) {
    const slug = normalized.slice("/reviews/".length);
    const review =
      queryData<StrapiEditorialReview>(state, (k) => k[0] === "editorialReview" && k[1] === slug) ?? null;
    const hit = crawlEntityByPath(normalized);
    const title = review?.title?.trim() || (hit?.kind === "review" ? hit.entity.title : slug);
    const body = synopsisExcerpt(review?.body ?? "", 400);
    const seo = crawlSeoCopyForPath(normalized);
    return detailShell(title, seo?.description || body || staticPageSeo.reviews.description, {
      body: body || undefined,
      href: normalized,
    });
  }

  if (normalized === "/articles") {
    const articles = queryData<StrapiArticle[]>(state, (k) => k[0] === "articles") ?? [];
    const fromRq = articles.map((a) => ({
      href: `/articles/${a.slug}`,
      title: a.title?.trim() || a.slug,
    }));
    return listShell(staticPageSeo.articles.title, staticPageSeo.articles.description, fromRq);
  }

  if (normalized.startsWith("/articles/")) {
    const slug = normalized.slice("/articles/".length);
    const article = queryData<StrapiArticle>(state, (k) => k[0] === "article" && k[1] === slug) ?? null;
    const title = article?.title?.trim() || slug;
    const body = synopsisExcerpt(article?.metaDescription || article?.content || "", 400);
    const seo = crawlSeoCopyForPath(normalized);
    return detailShell(title, seo?.description || body || staticPageSeo.articles.description, {
      body: body || undefined,
      href: normalized,
    });
  }

  if (normalized === "/events") {
    const events = queryData<StrapiEvent[]>(state, (k) => k[0] === "events") ?? [];
    const fromRq = events.map((e) => ({
      href: eventPath(e.slug),
      title: eventDisplayTitle(e),
    }));
    const fromEnrichment = (crawlEnrichment.culturalEvents ?? []).map((e) => ({
      href: e.path,
      title: e.title,
    }));
    return listShell(
      staticPageSeo.events.title,
      staticPageSeo.events.description,
      fromRq.length ? fromRq : fromEnrichment,
    );
  }

  if (normalized.startsWith("/events/")) {
    const slug = normalized.slice("/events/".length);
    const event = queryData<StrapiEvent>(state, (k) => k[0] === "event" && k[1] === slug) ?? null;
    const hit = crawlEntityByPath(normalized);
    const title =
      (event ? eventDisplayTitle(event) : "") ||
      (hit?.kind === "culturalEvent" ? hit.entity.title : slug);
    const body = synopsisExcerpt(
      event?.synopsisEl || (hit?.kind === "culturalEvent" ? hit.entity.synopsis ?? "" : ""),
      400,
    );
    const seo = crawlSeoCopyForPath(normalized);
    return detailShell(title, seo?.description || body || staticPageSeo.events.description, {
      body: body || undefined,
      href: normalized,
    });
  }

  if (normalized === "/privacy") {
    return detailShell(staticPageSeo.privacy.title, staticPageSeo.privacy.description, {
      body: staticPageSeo.privacy.description,
      href: "/privacy",
    });
  }

  const hit = crawlEntityByPath(normalized);
  const seo = crawlSeoCopyForPath(normalized) ?? seoCopyForPath(normalized);
  if (hit) {
    const title = "title" in hit.entity ? String(hit.entity.title) : seo.title;
    const body =
      "synopsis" in hit.entity && typeof hit.entity.synopsis === "string"
        ? synopsisExcerpt(hit.entity.synopsis, 400)
        : undefined;
    return detailShell(title || seo.title, seo.description, {
      body,
      href: normalized,
    });
  }

  return detailShell(seo.title, seo.description, { href: normalized });
}
