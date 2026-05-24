import { useEffect } from "react";

/** ⌘K / Ctrl+K — εστίαση στο πεδίο αναζήτησης της navbar. */
export function useGlobalSearchShortcut(focusSearch: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusSearch]);
}
