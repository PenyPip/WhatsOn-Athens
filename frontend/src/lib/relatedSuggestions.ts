/** Σταθερό pseudo-random από string (ίδιο slug → ίδια σειρά). */
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ανακάτεμα με seed - διαφορετικό ανά σελίδα, σταθερό ανά slug. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const out = [...items];
  const rand = mulberry32(hashSeed(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

/**
 * Προτιμά σχετικά (ίδιο είδος), μετά συμπληρώνει από τα υπόλοιπα.
 * Και τα δύο pools ανακατεύονται με seed ώστε να μην βγαίνουν πάντα τα ίδια.
 */
export function pickRelatedSuggestions<T>(
  candidates: T[],
  opts: {
    seed: string;
    limit?: number;
    isRelated: (item: T) => boolean;
  },
): T[] {
  const limit = opts.limit ?? 4;
  if (!candidates.length || limit <= 0) return [];

  const related: T[] = [];
  const rest: T[] = [];
  for (const item of candidates) {
    if (opts.isRelated(item)) related.push(item);
    else rest.push(item);
  }

  const ordered = [
    ...seededShuffle(related, `${opts.seed}:related`),
    ...seededShuffle(rest, `${opts.seed}:rest`),
  ];
  return ordered.slice(0, limit);
}
