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
