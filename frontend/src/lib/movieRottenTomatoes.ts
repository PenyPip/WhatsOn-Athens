/** Tomatometer 0–100. Το 0 είναι έγκυρη βαθμολογία. */
export function resolveRottenTomatoes(raw: number | null | undefined): number | null {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  const score = Math.round(n);
  if (score < 0 || score > 100) return null;
  return score;
}
