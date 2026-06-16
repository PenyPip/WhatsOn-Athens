import { useEffect, useState } from "react";

/** True μετά mount — ίδιο SSR + πρώτο client render (false), χωρίς hydration mismatch. */
export function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
