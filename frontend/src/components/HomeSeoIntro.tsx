import { Link } from "react-router-dom";
import { staticPageSeo } from "@/lib/pageSeoCopy";
import { moviesSectionPath } from "@/lib/moviesFilterPaths";

/** SEO κείμενο αρχικής — κάτω από τις ενότητες, πριν το footer (δεν σπάει το hero). */
export default function HomeSeoIntro() {
  const home = staticPageSeo.home;
  return (
    <section
      className="section-black border-t border-white/10 py-10 md:py-12"
      aria-labelledby="home-page-title"
    >
      <div className="container max-w-7xl">
        <h2
          id="home-page-title"
          className="font-display text-xl font-bold tracking-tight text-white md:text-2xl"
        >
          {home.h1}
        </h2>
        <p className="mt-3 max-w-3xl font-body text-sm leading-relaxed text-white/65 md:text-[0.9375rem]">
          Το <strong className="font-medium text-white/90">37Ν</strong> (
          <strong className="font-medium text-white/90">the37n.gr</strong>) είναι ο οδηγός σου για{" "}
          <strong className="font-medium text-white/90">τι παίζεται</strong> στα σινεμά και{" "}
          <strong className="font-medium text-white/90">πότε παίζεται</strong> κάθε{" "}
          <strong className="font-medium text-white/90">ταινία</strong> — ανά{" "}
          <strong className="font-medium text-white/90">κινηματογράφο</strong>, πόλη και είδος —{" "}
          <Link
            to={moviesSectionPath("today")}
            className="text-amber-100/95 underline decoration-amber-100/35 underline-offset-2 hover:text-white hover:decoration-white/50"
          >
            τι παίζεται σήμερα
          </Link>
          , φίλτρα ανά{" "}
          <Link
            to="/venues"
            className="text-amber-100/95 underline decoration-amber-100/35 underline-offset-2 hover:text-white hover:decoration-white/50"
          >
            κινηματογράφο και χώρο
          </Link>
          , ή τη{" "}
          <Link
            to="/movies"
            className="text-amber-100/95 underline decoration-amber-100/35 underline-offset-2 hover:text-white hover:decoration-white/50"
          >
            πλήρη λίστα ταινιών
          </Link>
          .
        </p>
        <p className="mt-3 max-w-3xl font-body text-sm leading-relaxed text-white/55 md:text-[0.9375rem]">
          Ενημερώνουμε ώρες προβολών, αφίσες και πρόγραμμα ανά ταινία — ώστε να βρίσκεις γρήγορα πού και πότε παίζεται
          κάθε ταινία, συμπεριλαμβανομένων θερινών σινεμά και εβδομάδας κινηματογράφου.
        </p>
      </div>
    </section>
  );
}
