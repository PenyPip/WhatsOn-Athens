"use client";

import { useCallback, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { absolutePageUrl } from "@/lib/siteMetadata";

type SharePageButtonProps = {
  path: string;
  title: string;
  variant?: "hero" | "default";
  className?: string;
};

function pageUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    return new URL(normalized, window.location.origin).toString();
  }
  return absolutePageUrl(normalized);
}

/** Αντιγραφή URL σελίδας στο πρόχειρο (σελίδες ταινιών κ.λπ.). */
export default function SharePageButton({ path, title, variant = "default", className }: SharePageButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopyLink = useCallback(async () => {
    const url = pageUrl(path);

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
      return;
    } catch {
      /* fallback */
    }

    window.prompt(`Αντέγραψε τον σύνδεσμο για «${title.trim() || "ταινία"}»:`, url);
  }, [path, title]);

  const heroClass =
    "inline-flex items-center gap-1.5 rounded border border-white/35 bg-white/10 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-60";
  const defaultClass =
    "inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60";

  return (
    <button
      type="button"
      onClick={() => void onCopyLink()}
      className={cn(variant === "hero" ? heroClass : defaultClass, className)}
      aria-label={copied ? "Ο σύνδεσμος αντιγράφηκε στο πρόχειρο" : "Αντιγραφή συνδέσμου σελίδας"}
    >
      {copied ? (
        <Check className="h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <Link2 className="h-4 w-4 shrink-0" aria-hidden />
      )}
      {copied ? "Αντιγράφηκε" : "Αντιγραφή συνδέσμου"}
    </button>
  );
}
