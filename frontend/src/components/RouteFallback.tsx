/** Ελαφρύ placeholder για lazy routes — χωρίς spinner (λιγότερο CLS/TBT). */
export default function RouteFallback() {
  return (
    <div className="min-h-[50vh] animate-pulse rounded-lg bg-muted/15" aria-busy="true" aria-label="Φόρτωση" />
  );
}
