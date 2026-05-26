import type { DehydratedState } from "@tanstack/react-query";

/** Ασφαλές JSON για RSC props & inline script (χωρίς </). */
export function serializeDehydratedState(state: DehydratedState): string {
  return JSON.stringify(state).replace(/</g, "\\u003c");
}

export function parseDehydratedState(json?: string): DehydratedState | undefined {
  if (!json) return undefined;
  try {
    return JSON.parse(json) as DehydratedState;
  } catch {
    return undefined;
  }
}
