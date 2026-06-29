import { truncateDescription } from "@/lib/siteMetadata";

export type TheaterVenueSeoInput = {
  name: string;
  address?: string | null;
};

/** Title / description / H1 για `/theater/venue/:slug`. */
export function theaterVenueProgramSeo(venue: TheaterVenueSeoInput) {
  const name = venue.name.trim();
  const addr = venue.address?.trim();

  const title = `${name} — πρόγραμμα παραστάσεων & θέατρο`;
  const h1 = `${name} — πρόγραμμα θεάτρου`;
  const subtitle = "Τρέχουσες παραστάσεις · ημερομηνίες & πληροφορίες";

  const description = truncateDescription(
    addr
      ? `${name}: πρόγραμμα παραστάσεων και εμφανίσεις (${addr}). Δες τι παίζεται τώρα — ημερομηνίες και εισιτήρια.`
      : `${name}: πρόγραμμα παραστάσεων και εμφανίσεις. Δες τι παίζεται τώρα — ημερομηνίες και εισιτήρια.`,
  );

  const ogTitle = `${name} — πρόγραμμα παραστάσεων`;
  const ogDescription = truncateDescription(
    addr
      ? `${name}: παραστάσεις και ημερομηνίες · ${addr}.`
      : `${name}: παραστάσεις, ημερομηνίες και εισιτήρια.`,
  );

  const intro = addr
    ? `Το ενημερωμένο πρόγραμμα του ${name} (${addr}): παραστάσεις που παίζουν τώρα, ημερομηνίες εμφανίσεων και πληροφορίες για εισιτήρια.`
    : `Το ενημερωμένο πρόγραμμα του ${name}: παραστάσεις που παίζουν τώρα, ημερομηνίες εμφανίσεων και πληροφορίες για εισιτήρια.`;

  return { title, description, h1, subtitle, ogTitle, ogDescription, intro };
}
