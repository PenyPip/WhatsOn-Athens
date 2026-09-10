/**
 * Εμφάνιση αίθουσας σε πρόγραμμα σινεμά.
 * Καταχώρηση στο CMS: Content Type «Αίθουσα» συνδεδεμένη με Χώρο· στην Προβολή επιλέγεται το `hall`.
 * Μία αίθουσα (π.χ. θερινά) → δεν εμφανίζεται ετικέτα.
 */

export function countDistinctHalls(
  rows: ReadonlyArray<{ hallId?: number | null; hallName?: string | null }>,
): number {
  const keys = new Set<string>();
  for (const row of rows) {
    if (row.hallId != null && Number.isFinite(Number(row.hallId)) && Number(row.hallId) > 0) {
      keys.add(`id:${row.hallId}`);
      continue;
    }
    const name = typeof row.hallName === "string" ? row.hallName.trim() : "";
    if (name) keys.add(`name:${name}`);
  }
  return keys.size;
}

/**
 * Εμφάνισε όνομα αίθουσας μόνο σε πολυαίθουσα.
 * - `venueHallCount > 1` από CMS `venue.halls`
 * - αλλιώς fallback: >1 distinct halls στο τρέχον πρόγραμμα του χώρου
 * - `venueHallCount === 1` → πάντα κρυφό (θερινά / μονή οθόνη)
 */
export function shouldShowHallName(
  hallName: string | null | undefined,
  options?: {
    venueHallCount?: number;
    programHallCount?: number;
  },
): boolean {
  const name = typeof hallName === "string" ? hallName.trim() : "";
  if (!name) return false;
  const venueCount = options?.venueHallCount ?? 0;
  if (venueCount === 1) return false;
  if (venueCount > 1) return true;
  return (options?.programHallCount ?? 0) > 1;
}

/** Όνομα για UI ή `undefined` αν δεν πρέπει να φανεί. */
export function visibleHallName(
  hallName: string | null | undefined,
  options?: {
    venueHallCount?: number;
    programHallCount?: number;
  },
): string | undefined {
  const name = typeof hallName === "string" ? hallName.trim() : "";
  if (!name || !shouldShowHallName(name, options)) return undefined;
  return name;
}

/** Πλήρης λεζάντα «Αίθουσα · …» ή `undefined`. */
export function hallCaption(
  hallName: string | null | undefined,
  options?: {
    venueHallCount?: number;
    programHallCount?: number;
  },
): string | undefined {
  const name = visibleHallName(hallName, options);
  return name ? `Αίθουσα · ${name}` : undefined;
}
