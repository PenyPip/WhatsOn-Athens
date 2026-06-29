import { format } from "date-fns";
import { el } from "date-fns/locale";
import { truncateDescription } from "@/lib/siteMetadata";

export type CinemaVenueSeoInput = {
  name: string;
  address?: string | null;
};

function nameLooksLikeCinema(name: string): boolean {
  return /\b(cine|σινε|cinema|κινηματογράφος)\b/i.test(name);
}

function programMonthLabel(): string {
  return format(new Date(), "LLLL yyyy", { locale: el });
}

/** Title / description / H1 για `/movies/venue/:slug` — στοχεύει αναζητήσεις «[σινεμά] πρόγραμμα». */
export function cinemaVenueProgramSeo(venue: CinemaVenueSeoInput) {
  const name = venue.name.trim();
  const addr = venue.address?.trim();
  const looksLikeCinema = nameLooksLikeCinema(name);
  const monthYear = programMonthLabel();

  const title = looksLikeCinema
    ? `${name} — πρόγραμμα ταινιών ${monthYear} · τι παίζει σήμερα`
    : `${name} σινεμά — πρόγραμμα ${monthYear} · τι παίζει σήμερα`;

  const h1 = `${name} — πρόγραμμα ταινιών`;

  const subtitle = `Ενημερωμένο πρόγραμμα ${monthYear} · τι παίζεται & ώρες προβολών`;

  const description = truncateDescription(
    addr
      ? `${name}: πρόγραμμα ταινιών και ώρες προβολών (${addr}). Δες τι παίζεται τώρα — αφίσες και εισιτήρια.`
      : `${name}: πρόγραμμα ταινιών και ώρες προβολών. Δες τι παίζεται τώρα — αφίσες και εισιτήρια.`,
  );

  /** Open Graph / Twitter — χωρίς «· 37Ν», πιο κοντά στις αναζητήσεις «[όνομα] πρόγραμμα». */
  const ogTitle = looksLikeCinema
    ? `${name} πρόγραμμα — ταινίες & ώρες`
    : `${name} σινεμά πρόγραμμα — ταινίες & ώρες`;

  const ogDescription = truncateDescription(
    looksLikeCinema
      ? `${name} πρόγραμμα: ταινίες, ώρες προβολών${addr ? ` · ${addr}` : ""}. Τι παίζεται τώρα.`
      : `${name} σινεμά πρόγραμμα${addr ? ` (${addr})` : ""}: ταινίες και ώρες προβολών. Τι παίζεται τώρα.`,
  );

  const intro = looksLikeCinema
    ? addr
      ? `Το ενημερωμένο πρόγραμμα του ${name} (${addr}): ταινίες που παίζουν τώρα, ώρες προβολών και αφίσες — όλα σε μία σελίδα.`
      : `Το ενημερωμένο πρόγραμμα του ${name}: ταινίες που παίζουν τώρα, ώρες προβολών και αφίσες.`
    : addr
      ? `Πρόγραμμα σινεμά ${name} (${addr}) — δες τι παίζεται σήμερα και αύριο, ώρες προβολών και εισιτήρια.`
      : `Πρόγραμμα σινεμά ${name} — δες τι παίζεται σήμερα και αύριο, ώρες προβολών και εισιτήρια.`;

  return { title, description, h1, subtitle, ogTitle, ogDescription, intro };
}
