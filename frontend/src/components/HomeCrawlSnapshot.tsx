import type { StrapiMovie } from "@/lib/api";

type HomeCrawlSnapshotProps = {
  movies: Pick<StrapiMovie, "slug" | "title">[];
};

/** Σύνδεσμοι ταινιών στο static HTML (χωρίς SSR του SPA στην αρχική). */
export default function HomeCrawlSnapshot({ movies }: HomeCrawlSnapshotProps) {
  if (!movies.length) return null;
  return (
    <nav className="sr-only" aria-label="Λίστα ταινιών">
      <ul>
        {movies.map((m) => (
          <li key={m.slug}>
            <a href={`/movies/${m.slug}`}>{m.title}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
