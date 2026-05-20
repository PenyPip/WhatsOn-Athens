import spaPaths from "@/generated/spa-static-paths.json";
import { pathFromSlugParam, seoCopyForPath } from "@/lib/jsonLdPage";
import { siteSeo } from "@/lib/siteMetadata";

const MAIN_NAV: { href: string; label: string }[] = [
  { href: "/", label: "Αρχική" },
  { href: "/movies", label: "Ταινίες" },
  { href: "/theater", label: "Θέατρο" },
  { href: "/venues", label: "Χώροι" },
  { href: "/dining", label: "Φαγητό" },
  { href: "/reviews", label: "Κριτικές" },
  { href: "/privacy", label: "Απόρρητο & όροι" },
];

type SpaPathEntry = { slug: string[] };

/**
 * Στατικό περιεχόμενο + εσωτερικοί σύνδεσμοι στο αρχικό HTML (entity-graph, H1, κείμενο).
 * Κρυφό οπτικά· το SPA το αντικαθιστά μετά το hydration.
 */
export default function StaticCrawlShell({ path }: { path: string }) {
  const normalized = path === "" ? "/" : path.startsWith("/") ? path : `/${path}`;
  const { title, description } = seoCopyForPath(normalized);

  const entityPaths = (spaPaths as SpaPathEntry[])
    .map((e) => pathFromSlugParam(e.slug))
    .filter((p) => p !== normalized);

  return (
    <div id="static-crawl-shell" className="sr-only">
      <header>
        <p>
          <a href="/">{siteSeo.siteName}</a> — {siteSeo.description}
        </p>
        <nav aria-label="Κύρια πλοήγηση">
          <ul>
            {MAIN_NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main>
        <h1>{title}</h1>
        <p>{description}</p>
        <p>
          Ο οδηγός {siteSeo.siteName} για ταινίες στα σινεμά, θεατρικές παραστάσεις, χώρους προβολής και
          εστιατόρια στην Αθήνα και τη Θεσσαλονίκη. Δες ώρες προβολών, αφίσες, κριτικές και φίλτρα ανά πόλη
          και σινεμά.
        </p>
        <nav aria-label="Σελίδες περιεχομένου">
          <h2 className="text-sm font-semibold">Όλες οι σελίδες</h2>
          <ul>
            {entityPaths.map((href) => {
              const label = seoCopyForPath(href).title;
              return (
                <li key={href}>
                  <a href={href}>{label}</a>
                </li>
              );
            })}
          </ul>
        </nav>
        <footer>
          <p>
            <a href="/privacy">Πολιτική απορρήτου</a> · <a href="/privacy#oroi">Όροι χρήσης</a>
          </p>
          <p>
            Επικοινωνία: <a href="mailto:hello@the37n.gr">hello@the37n.gr</a>
          </p>
        </footer>
      </main>
    </div>
  );
}
