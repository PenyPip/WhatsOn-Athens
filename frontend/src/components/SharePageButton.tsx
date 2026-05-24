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
    "inline-flex size-12 shrink-0 items-center justify-center rounded border border-white/35 bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-60";
  const defaultClass =
    "inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-60";

  const label = copied ? "Ο σύνδεσμος αντιγράφηκε" : "Αντιγραφή συνδέσμου";

  return (
    <button
      type="button"
      onClick={() => void onCopyLink()}
      className={cn(variant === "hero" ? heroClass : defaultClass, className)}
      aria-label={label}
      title={label}
    >
      {copied ? (
        <Check className="h-5 w-5 shrink-0" aria-hidden />
      ) : (
        <Link2 className="h-5 w-5 shrink-0" aria-hidden />
      )}
    </button>
  );
}
