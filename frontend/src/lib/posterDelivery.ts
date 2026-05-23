/** URL για LCP/preload — συμφωνεί με το default `src` του hero (μικρότερο format). */
export function posterLcpSrc(posterUrl?: string | null, posterSrcSet?: string | null): string | null {
  const direct = typeof posterUrl === "string" ? posterUrl.trim() : "";
  if (!direct) return null;

  const set = typeof posterSrcSet === "string" ? posterSrcSet.trim() : "";
  if (!set) return direct;

  let smallest: { url: string; w: number } | null = null;
  for (const part of set.split(",")) {
    const bit = part.trim();
    const m = bit.match(/^(\S+)\s+(\d+)w$/);
    if (!m) continue;
    const w = Number(m[2]);
    if (!Number.isFinite(w) || w <= 0) continue;
    if (!smallest || w < smallest.w) smallest = { url: m[1], w };
  }

  return smallest?.url ?? direct;
}
