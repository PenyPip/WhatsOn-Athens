import { Link } from "react-router-dom";
import { staticPageSeo } from "@/lib/pageSeoCopy";
import { moviesSectionPath } from "@/lib/moviesFilterPaths";

/** Στατικό SEO intro — σταθερό min-height για λιγότερο CLS. */
export default function HomeSeoIntro() {
  const home = staticPageSeo.home;
  return (
    <section
      className="min-h-[11.5rem] border-b border-border/50 bg-muted/15 py-8 md:min-h-[12.5rem] md:py-10"
      aria-labelledby="home-page-title"
    >
      <div className="container max-w-7xl">
        <h2
          id="home-page-title"
          className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl"
        >
          {home.h1}
        </h2>
        <p className="mt-3 max-w-3xl font-body text-sm leading-relaxed text-muted-foreground md:text-base">
          Το <strong className="font-medium text-foreground">37Ν</strong> (
          <strong className="font-medium text-foreground">the37n.gr</strong>) είναι ο οδηγός σου για{" "}
          <strong className="font-medium text-foreground">τι παίζεται</strong> στα σινεμά και{" "}
          <strong className="font-medium text-foreground">πότε παίζεται</strong> κάθε{" "}
          <strong className="font-medium text-foreground">ταινία</strong> — ανά{" "}
          <strong className="font-medium text-foreground">κινηματογράφο</strong>, πόλη και είδος. Δες{" "}
          <Link to={moviesSectionPath("today")} className="text-[#13143E] underline decoration-[#13143E]/30 underline-offset-2 hover:decoration-[#13143E]">
            τι παίζεται σήμερα
          </Link>
          , φίλτρα ανά <Link to="/venues" className="text-[#13143E] underline decoration-[#13143E]/30 underline-offset-2 hover:decoration-[#13143E]">κινηματογράφο και χώρο</Link>
          , ή τη{" "}
          <Link to="/movies" className="text-[#13143E] underline decoration-[#13143E]/30 underline-offset-2 hover:decoration-[#13143E]">
            πλήρη λίστα ταινιών
          </Link>
          .
        </p>
        <p className="mt-3 max-w-3xl font-body text-sm leading-relaxed text-muted-foreground md:text-base">
          Ενημερώνουμε ώρες προβολών, αφίσες και πρόγραμμα ανά ταινία — ώστε να βρίσκεις γρήγορα πού και πότε παίζεται κάθε ταινία,
          συμπεριλαμβανομένων θερινών σινεμά και εβδομάδας κινηματογράφου.
        </p>
      </div>
    </section>
  );
}
