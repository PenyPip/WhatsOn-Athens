"use client";

import { useCallback, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { absolutePageUrl } from "@/lib/siteMetadata";

type SharePageButtonProps = {
  path: string;
  title: string;
  /** Σύντομο κείμενο για native share (WhatsApp, κ.λπ.). */
  shareText?: string;
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

export default function SharePageButton({
  path,
  title,
  shareText,
  variant = "default",
  className,
}: SharePageButtonProps) {
  const [copied, setCopied] = useState(false);

  const onShare = useCallback(async () => {
    const url = pageUrl(path);
    const text = shareText?.trim() || `Δες «${title.trim()}» στο 37Ν`;

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: title.trim() || "37Ν", text, url });
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Αντέγραψε τον σύνδεσμο:", url);
    }
  }, [path, shareText, title]);

  const heroClass =
    "inline-flex items-center gap-1.5 rounded border border-white/35 bg-white/10 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-60";
  const defaultClass =
    "inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60";

  return (
    <button
      type="button"
      onClick={() => void onShare()}
      className={cn(variant === "hero" ? heroClass : defaultClass, className)}
      aria-label={copied ? "Ο σύνδεσμος αντιγράφηκε" : "Κοινοποίηση σελίδας"}
    >
      {copied ? (
        <Check className="h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <Share2 className="h-4 w-4 shrink-0" aria-hidden />
      )}
      {copied ? "Αντιγράφηκε" : "Κοινοποίηση"}
    </button>
  );
}
