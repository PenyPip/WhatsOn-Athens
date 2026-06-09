import type { StrapiShowtime, StrapiTheaterPerformance, StrapiVenue } from "@/lib/api";
import { cinemaPathSlugFromMoreLink, moviesVenueProgramPath } from "@/lib/moviesVenuePath";
import { isCinemaVenue, programHrefForVenue } from "@/lib/venueType";

/** Κανονικοποίηση ονόματος — ίδιο σινεμά αν υπάρχουν «Θερινό» / θερινό σινεμά κ.λπ. */
export function normalizeCinemaGroupName(name: string): string {
  let n = name.trim();
  if (!n) return "";
  n = n.replace(/\s*\([^)]*θεριν[^)]*\)/gi, "");
  n = n.replace(/\s*\([^)]*summer[^)]*\)/gi, "");
  n = n.replace(/\s*[-–·|]\s*θεριν(?:ό|ο|ά|α)?(?:\s+σινεμά)?\s*$/i, "");
  n = n.replace(/\s+θεριν(?:ό|ο|ά|α)?(?:\s+σινεμά)?\s*$/i, "");
  n = n.replace(/\s+summer(?:\s+cinema)?\s*$/i, "");
  n = n.replace(/\s+open\s*air\s*$/i, "");
  return n.replace(/\s+/g, " ").trim();
}

function venuesMatchingNormalizedName(venues: StrapiVenue[], norm: string): StrapiVenue[] {
  if (!norm) return [];
  return venues.filter((v) => normalizeCinemaGroupName(v.name) === norm);
}

/** Προτίμηση εγγραφής με slug (για σύνδεσμο «Πρόγραμμα») και χωρίς «θερινό» μόνο στο όνομα. */
export function pickCanonicalVenue(venueList: StrapiVenue[]): StrapiVenue {
  const sorted = [...venueList].sort((a, b) => {
    const aSlug = a.slug?.trim() ? 0 : 1;
    const bSlug = b.slug?.trim() ? 0 : 1;
    if (aSlug !== bSlug) return aSlug - bSlug;
    const aNorm = normalizeCinemaGroupName(a.name);
    const bNorm = normalizeCinemaGroupName(b.name);
    const aPlain = a.name.trim() === aNorm ? 0 : 1;
    const bPlain = b.name.trim() === bNorm ? 0 : 1;
    if (aPlain !== bPlain) return aPlain - bPlain;
    if (a.summerOutdoor !== b.summerOutdoor) return a.summerOutdoor ? 1 : -1;
    return a.id - b.id;
  });
  return sorted[0];
}

/** Συγχώνευση metadata (maps, κράτηση) από όλες τις εγγραφές ίδιου σινεμά. */
export function mergeVenueGroup(venueList: StrapiVenue[]): StrapiVenue | undefined {
  if (!venueList.length) return undefined;
  const unique = [...new Map(venueList.map((v) => [v.id, v])).values()];
  const canonical = pickCanonicalVenue(unique);
  const displayName = normalizeCinemaGroupName(canonical.name) || canonical.name;
  const slug = unique.map((v) => v.slug?.trim()).find(Boolean) ?? canonical.slug?.trim();
  return {
    ...canonical,
    slug: slug || canonical.slug,
    name: displayName,
    googleMapsUrl: unique.find((v) => v.googleMapsUrl?.trim())?.googleMapsUrl ?? canonical.googleMapsUrl,
    moreLink: unique.find((v) => v.moreLink?.trim())?.moreLink ?? canonical.moreLink,
    summerOutdoor: unique.some((v) => v.summerOutdoor),
  };
}

/**
 * Ένα κλειδί ανά φυσικό σινεμά — θερινές και κλειστές προβολές στο ίδιο block.
 */
export function cinemaGroupKey(st: StrapiShowtime, venues?: StrapiVenue[]): string {
  const list = venues ?? [];
  const linked = findVenueForShowtime(list, st);
  const rawName = linked?.name?.trim() || (typeof st.venue === "string" ? st.venue.trim() : "");
  const norm = normalizeCinemaGroupName(rawName);

  if (list.length && norm) {
    const siblings = venuesMatchingNormalizedName(list, norm);
    if (siblings.length) {
      const canonical = pickCanonicalVenue(siblings);
      if (canonical.slug?.trim()) return `cinema:${canonical.slug.trim()}`;
      return `cinema:n:${norm.toLowerCase()}`;
    }
  }

  if (linked?.slug?.trim()) return `cinema:${linked.slug.trim()}`;
  if (st.venueId != null) return `v:${Number(st.venueId)}`;
  return `n:${(norm || rawName || "unknown").toLowerCase()}`;
}

export type CinemaGroupResolved = {
  groupKey: string;
  venueName: string;
  venue?: StrapiVenue;
};

/** Όνομα + venue για ομάδα προβολών (μία κάρτα ανά σινεμά). */
export function resolveCinemaGroupFromShowtimes(
  slots: StrapiShowtime[],
  venues?: StrapiVenue[],
): CinemaGroupResolved {
  const list = venues ?? [];
  if (!slots.length) {
    return { groupKey: "unknown", venueName: "Χώρος χωρίς όνομα" };
  }

  const groupKey = cinemaGroupKey(slots[0], list);
  const linkedVenues = new Map<number, StrapiVenue>();
  for (const st of slots) {
    const v = findVenueForShowtime(list, st);
    if (v) linkedVenues.set(v.id, v);
  }

  const norms = new Set(
    [...linkedVenues.values()].map((v) => normalizeCinemaGroupName(v.name)).filter(Boolean),
  );
  const allInGroup: StrapiVenue[] = [];
  for (const norm of norms) {
    for (const v of venuesMatchingNormalizedName(list, norm)) {
      allInGroup.push(v);
    }
  }
  if (!allInGroup.length) {
    for (const v of linkedVenues.values()) allInGroup.push(v);
  }

  const merged = mergeVenueGroup(allInGroup);
  const fallbackName =
    normalizeCinemaGroupName(typeof slots[0].venue === "string" ? slots[0].venue : "") ||
    (typeof slots[0].venue === "string" ? slots[0].venue.trim() : "") ||
    "Χώρος χωρίς όνομα";

  return {
    groupKey,
    venueName: merged?.name ?? fallbackName,
    venue: merged,
  };
}

/** Ταίριασμα χώρου από showtime (id ή όνομα). */
export function findVenueForShowtime(
  venues: StrapiVenue[] | undefined,
  st: StrapiShowtime,
): StrapiVenue | undefined {
  if (!venues?.length) return undefined;
  if (st.venueId != null) {
    const v = venues.find((x) => Number(x.id) === Number(st.venueId));
    if (v) return v;
  }
  const name = typeof st.venue === "string" ? st.venue.trim() : "";
  if (name) return findVenueByName(venues, name);
  return undefined;
}

export function findVenueByName(venues: StrapiVenue[] | undefined, name: string): StrapiVenue | undefined {
  const n = name.trim();
  if (!n || !venues?.length) return undefined;
  const norm = normalizeCinemaGroupName(n);
  const byNorm = venues.filter((x) => normalizeCinemaGroupName(x.name) === norm);
  if (byNorm.length) return pickCanonicalVenue(byNorm);
  const exact = venues.filter((x) => x.name.trim() === n);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return pickCanonicalVenue(exact);
  return undefined;
}

/** Κλειδί ομαδοποίησης (`cinema:slug` / `v:id` / `n:όνομα`) → venue record. */
export function findVenueFromStableKey(
  venues: StrapiVenue[] | undefined,
  venueKey: string,
  venueLabel: string,
): StrapiVenue | undefined {
  if (!venues?.length) return undefined;

  if (venueKey.startsWith("cinema:")) {
    const tail = venueKey.slice(7);
    if (tail.startsWith("n:")) {
      const norm = tail.slice(2);
      const siblings = venues.filter((v) => normalizeCinemaGroupName(v.name) === norm);
      return siblings.length ? mergeVenueGroup(siblings) : undefined;
    }
    const bySlug = venues.filter((v) => v.slug?.trim() === tail);
    if (bySlug.length) return mergeVenueGroup(bySlug);
  }

  if (venueKey.startsWith("v:")) {
    const id = Number(venueKey.slice(2));
    if (Number.isFinite(id)) {
      const v = venues.find((x) => Number(x.id) === id);
      if (v) {
        const siblings = venuesMatchingNormalizedName(venues, normalizeCinemaGroupName(v.name));
        return mergeVenueGroup(siblings.length ? siblings : [v]);
      }
    }
  }

  return findVenueByName(venues, venueLabel);
}

function normalizeProgramVenueSlug(slug: string | undefined | null): string {
  return String(slug || "").trim().toLowerCase();
}

/** Ταύτιση χώρου από slug URL προγράμματος ή slug μέσα στο more_link. */
export function findVenueByProgramSlug(venues: StrapiVenue[], slug: string): StrapiVenue | null {
  const want = normalizeProgramVenueSlug(slug);
  if (!want || !venues.length) return null;
  const bySlug = venues.find((v) => normalizeProgramVenueSlug(v.slug) === want);
  if (bySlug) return bySlug;
  return venues.find((v) => cinemaPathSlugFromMoreLink(v.moreLink) === want) ?? null;
}

/** Ελάχιστο venue από populated προβολές (όταν η λίστα venues έχει κοπεί). */
export function venueFromShowtimesBySlug(
  showtimes: StrapiShowtime[],
  slug: string,
): StrapiVenue | null {
  const want = normalizeProgramVenueSlug(slug);
  if (!want) return null;
  for (const st of showtimes) {
    if (normalizeProgramVenueSlug(st.venueSlug) !== want) continue;
    const name = typeof st.venue === "string" ? st.venue.trim() : "";
    if (!name && st.venueId == null) continue;
    return {
      id: st.venueId ?? 0,
      documentId: "",
      slug: st.venueSlug ?? slug.trim(),
      name: name || slug.trim(),
      address: "",
      city: "",
      googleMapsUrl: "",
      seatsTotal: 0,
      type: "cinema",
      summerOutdoor: Boolean(st.venueSummerOutdoor),
      moreLink: "",
    };
  }
  return null;
}

export function moviesHrefForVenue(venue: StrapiVenue | undefined): string | undefined {
  if (!venue || !isCinemaVenue(venue)) return undefined;
  return programHrefForVenue(venue);
}

/** Σύνδεσμος προγράμματος (σινεμά ή θέατρο). */
export function venueProgramHref(venue: StrapiVenue | undefined): string | undefined {
  if (!venue) return undefined;
  return programHrefForVenue(venue);
}

/** Ελάχιστο venue από θεατρικές εμφανίσεις (όταν η λίστα venues έχει κοπεί). */
export function venueFromPerformancesBySlug(
  performances: StrapiTheaterPerformance[],
  slug: string,
): StrapiVenue | null {
  const want = normalizeProgramVenueSlug(slug);
  if (!want) return null;
  for (const p of performances) {
    if (normalizeProgramVenueSlug(p.venueSlug) !== want) continue;
    const name = typeof p.venue === "string" ? p.venue.trim() : "";
    if (!name && p.venueId == null) continue;
    return {
      id: p.venueId ?? 0,
      documentId: "",
      slug: p.venueSlug ?? slug.trim(),
      name: name || slug.trim(),
      address: "",
      city: "",
      googleMapsUrl: "",
      seatsTotal: 0,
      type: "theater",
      summerOutdoor: false,
      moreLink: "",
    };
  }
  return null;
}

function moviesHrefFromVenueSlug(slug: string | undefined): string | undefined {
  const s = slug?.trim();
  return s ? moviesVenueProgramPath(s) : undefined;
}

/** Σύνδεσμος λίστας ταινιών για χώρο — δοκιμή από όλες τις προβολές της ομάδας. */
export function moviesHrefForShowtimes(
  slots: StrapiShowtime[],
  venues?: StrapiVenue[],
  groupKey?: string,
): string | undefined {
  const { venue } = resolveCinemaGroupFromShowtimes(slots, venues);
  const fromGroup = moviesHrefForVenue(venue);
  if (fromGroup) return fromGroup;
  for (const st of slots) {
    const href = moviesHrefForVenue(findVenueForShowtime(venues, st));
    if (href) return href;
    const fromSlotSlug = moviesHrefFromVenueSlug(st.venueSlug);
    if (fromSlotSlug) return fromSlotSlug;
  }
  if (groupKey?.startsWith("cinema:")) {
    const tail = groupKey.slice(7);
    if (tail && !tail.startsWith("n:")) {
      return moviesHrefFromVenueSlug(tail);
    }
  }
  return undefined;
}

export function normalizeHttpUrl(raw: string | undefined | null): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(candidate);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {
    return null;
  }
  return null;
}

/** Σύνδεσμος Google Maps — CMS URL (με https αν λείπει) ή αναζήτηση από διεύθυνση. */
export function resolveGoogleMapsHref(
  googleMapsUrl: string | undefined | null,
  address?: string | undefined | null,
): string | null {
  const fromCms = normalizeHttpUrl(googleMapsUrl);
  if (fromCms) return fromCms;
  const addr = typeof address === "string" ? address.trim() : "";
  if (!addr) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
}

/** URL για ενσωμάτωση χάρτη (iframe) — CMS embed/share ή αναζήτηση από κείμενο τοποθεσίας. */
export function resolveGoogleMapsEmbedSrc(
  googleMapsUrl: string | undefined | null,
  searchQuery?: string | undefined | null,
): string | null {
  const fromCms = normalizeHttpUrl(googleMapsUrl);
  if (fromCms) {
    if (fromCms.includes("/maps/embed")) return fromCms;
    try {
      const u = new URL(fromCms);
      if (/\.google\./i.test(u.hostname) && u.pathname.includes("/maps")) {
        u.searchParams.set("output", "embed");
        return u.toString();
      }
    } catch {
      /* πέφτουμε σε αναζήτηση */
    }
  }
  const q = typeof searchQuery === "string" ? searchQuery.trim() : "";
  if (!q) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&hl=el&z=16&output=embed`;
}

export function isValidExternalUrl(raw: string | undefined | null): raw is string {
  return normalizeHttpUrl(raw) != null;
}
