import { Component, lazy, type ComponentType, type ErrorInfo, type LazyExoticComponent, type ReactNode } from "react";

const RELOAD_KEY = "whatson:chunk-reload";
const IDLE_RELOAD_KEY = "whatson:idle-reload";
/** Μετά από τόσο idle στο background, κάνε soft reload ώστε να μην μείνουν παλιά hashed chunks. */
const LONG_IDLE_MS = 6 * 60 * 60 * 1000;

export function isChunkLoadError(error: unknown): boolean {
  const msg = String(
    (error as { message?: unknown; name?: unknown })?.message ||
      (error as { name?: unknown })?.name ||
      error ||
      "",
  );
  return (
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Loading CSS chunk/i.test(msg)
  );
}

/** Ένα reload ανά session όταν λείπει παλιό JS chunk μετά από deploy. */
export function tryReloadForStaleChunk(error?: unknown): boolean {
  if (typeof window === "undefined") return false;
  if (error != null && !isChunkLoadError(error)) return false;
  try {
    if (sessionStorage.getItem(RELOAD_KEY)) return false;
    sessionStorage.setItem(RELOAD_KEY, "1");
  } catch {
    /* private mode — προσπάθούμε reload ούτως ή άλλως */
  }
  window.location.reload();
  return true;
}

function clearChunkReloadFlag() {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * React.lazy με αυτόματο reload αν το hashed chunk λείπει (κλασικό σε καρτέλα ανοιχτή μέρες + νέο deploy).
 */
export function lazyWithChunkReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await factory();
      clearChunkReloadFlag();
      return mod;
    } catch (error) {
      if (tryReloadForStaleChunk(error)) {
        return new Promise(() => {});
      }
      throw error;
    }
  });
}

type ChunkBoundaryState = { failed: boolean };

/** Πιάνει αποτυχημένα lazy imports που φτάνουν ως render error. */
export class ChunkLoadErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ChunkBoundaryState
> {
  state: ChunkBoundaryState = { failed: false };

  static getDerivedStateFromError(): ChunkBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    if (tryReloadForStaleChunk(error)) return;
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      this.props.fallback ?? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-sm text-muted-foreground">Κάτι πήγε στραβά στη φόρτωση.</p>
          <button
            type="button"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
            onClick={() => window.location.reload()}
          >
            Ανανέωση
          </button>
        </div>
      )
    );
  }
}

/**
 * Αν η καρτέλα έμεινε στο background πολλές ώρες, reload στο επόμενο visible
 * (νέο HTML + chunks · αποφεύγει «νεκρή» SPA στο κινητό).
 */
export function installStaleTabRecovery() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};

  let hiddenAt = document.visibilityState === "hidden" ? Date.now() : 0;

  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      return;
    }
    if (!hiddenAt) return;
    const idleMs = Date.now() - hiddenAt;
    hiddenAt = 0;
    if (idleMs < LONG_IDLE_MS) return;
    try {
      const lastReloadAt = Number(sessionStorage.getItem(IDLE_RELOAD_KEY) || 0);
      if (lastReloadAt && Date.now() - lastReloadAt < LONG_IDLE_MS) return;
      sessionStorage.setItem(IDLE_RELOAD_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  document.addEventListener("visibilitychange", onVisibility);
  return () => document.removeEventListener("visibilitychange", onVisibility);
}
