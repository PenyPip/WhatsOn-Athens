import { useEffect, type Dispatch, type SetStateAction } from "react";

/** ⌘K / Ctrl+K — χωρίς να φορτώνεται το GlobalSearch chunk μέχρι άνοιγμα. */
export function useGlobalSearchShortcut(setOpen: Dispatch<SetStateAction<boolean>>): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);
}
