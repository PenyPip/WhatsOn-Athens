/** Ελάχιστα πεδία για crawlable HTML / JSON-LD (build-time). */
export type CrawlMovieRow = {
  slug: string;
  title: string;
  href: string;
};

export type CrawlVenueRow = {
  slug: string;
  name: string;
  href: string;
};

export type HomeCrawlSnapshot = {
  today: CrawlMovieRow[];
  week: CrawlMovieRow[];
  summer: CrawlMovieRow[];
  summerVenues: CrawlVenueRow[];
};

export type MoviesListCrawlSnapshot = {
  h1: string;
  intro: string;
  movies: CrawlMovieRow[];
};

export type DetailCrawlScheduleRow = {
  label: string;
  venueName: string;
  datetime: string;
};

export type DetailCrawlSnapshot = {
  kind: "movie" | "theater";
  h1: string;
  synopsis: string;
  href: string;
  scheduleHeading: string;
  schedule: DetailCrawlScheduleRow[];
  /** Για ScreeningEvent JSON-LD στο server HTML. */
  jsonLd?: Record<string, unknown> | null;
};

export type SeoCrawlLink = {
  href: string;
  title: string;
};

/** Ενιαίο crawl snapshot για κάθε δημόσια σελίδα. */
export type SeoCrawlSnapshot = {
  kind: "home" | "list" | "detail";
  h1: string;
  intro: string;
  links: SeoCrawlLink[];
  body?: string;
  scheduleHeading?: string;
  schedule?: { label: string }[];
  /** Πλούσιο home snapshot όταν kind=home (προαιρετικό για συμβατότητα). */
  home?: HomeCrawlSnapshot;
};
