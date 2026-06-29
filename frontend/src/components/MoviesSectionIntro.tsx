import { Link } from "react-router-dom";
import { moviesSectionPath } from "@/lib/moviesFilterPaths";

/** Crawlable intro κάτω από hero — λίστες `/movies/today` κ.λπ. */
export default function MoviesSectionIntro({
  sectionLabel,
  intro,
}: {
  sectionLabel: string;
  intro: string;
}) {
  return (
    <section
      className="border-b border-white/10 bg-background"
      aria-label={sectionLabel}
    >
      <div className="container py-4 md:py-5">
        <p className="max-w-3xl font-body text-sm leading-relaxed text-muted-foreground md:text-[0.9375rem]">
          {intro}
        </p>
        <p className="mt-3 max-w-3xl font-body text-sm leading-relaxed text-muted-foreground/90 md:text-[0.9375rem]">
          Δες επίσης{" "}
          <Link
            to={moviesSectionPath("week")}
            className="text-foreground/85 underline decoration-foreground/25 underline-offset-2 hover:text-foreground hover:decoration-foreground/45"
          >
            εβδομάδα κινηματογράφου
          </Link>
          ,{" "}
          <Link
            to={moviesSectionPath("summer")}
            className="text-foreground/85 underline decoration-foreground/25 underline-offset-2 hover:text-foreground hover:decoration-foreground/45"
          >
            θερινά σινεμά
          </Link>{" "}
          ή{" "}
          <Link
            to="/venues"
            className="text-foreground/85 underline decoration-foreground/25 underline-offset-2 hover:text-foreground hover:decoration-foreground/45"
          >
            πρόγραμμα ανά κινηματογράφο
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
