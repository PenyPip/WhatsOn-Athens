/** URL για LCP/preload — συμφωνεί με το default `src` του hero (μικρότερο format). */
export function posterLcpSrc(posterUrl?: string | null, posterSrcSet?: string | null): string | null {
  const direct = typeof posterUrl === "string" ? posterUrl.trim() : "";
  if (!direct) return null;

  const set = typeof posterSrcSet === "string" ? posterSrcSet.trim() : "";
  if (!set) return direct;

  // Για LCP επιλέγουμε μικρό αλλά όχι "thumbnail": κοντά στα 320w (hero αφίσα mobile).
  let best: { url: string; w: number } | null = null;
  const target = 320;
  for (const part of set.split(",")) {
    const bit = part.trim();
    const m = bit.match(/^(\S+)\s+(\d+)w$/);
    if (!m) continue;
    const w = Number(m[2]);
    if (!Number.isFinite(w) || w <= 0) continue;
    if (!best) {
      best = { url: m[1], w };
      continue;
    }
    const bestDelta = Math.abs(best.w - target);
    const nextDelta = Math.abs(w - target);
    if (nextDelta < bestDelta || (nextDelta === bestDelta && w < best.w)) {
      best = { url: m[1], w };
    }
  }

  return best?.url ?? direct;
}
