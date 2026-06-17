"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Link2, Mail, MessageCircle, Share2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { absolutePageUrl } from "@/lib/siteMetadata";
import { useClientMounted } from "@/hooks/useClientMounted";

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

type ShareAction = {
  id: string;
  label: string;
  icon: typeof Share2;
  run: () => void | Promise<void>;
};

function openShareWindow(url: string) {
  window.open(url, "_blank", "noopener,noreferrer,width=600,height=520");
}

export default function SharePageButton({ path, title, variant = "default", className }: SharePageButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const mounted = useClientMounted();

  const url = useMemo(() => pageUrl(path), [path]);
  const shareTitle = title.trim() || "ταινία";
  const canNativeShare =
    mounted && typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
      return;
    } catch {
      /* fallback */
    }
    window.prompt(`Αντέγραψε τον σύνδεσμο για «${shareTitle}»:`, url);
  }, [url, shareTitle]);

  const actions: ShareAction[] = useMemo(() => {
    const text = `${shareTitle}\n${url}`;
    const encUrl = encodeURIComponent(url);
    const encText = encodeURIComponent(text);

    const list: ShareAction[] = [];

    if (canNativeShare) {
      list.push({
        id: "native",
        label: "Κοινοποίηση…",
        icon: Share2,
        run: async () => {
          await navigator.share({ title: shareTitle, url, text: shareTitle });
          setOpen(false);
        },
      });
    }

    list.push(
      {
        id: "copy",
        label: copied ? "Ο σύνδεσμος αντιγράφηκε" : "Αντιγραφή συνδέσμου",
        icon: copied ? Check : Link2,
        run: async () => {
          await copyLink();
        },
      },
      {
        id: "whatsapp",
        label: "WhatsApp",
        icon: MessageCircle,
        run: () => {
          openShareWindow(`https://wa.me/?text=${encText}`);
          setOpen(false);
        },
      },
      {
        id: "facebook",
        label: "Facebook",
        icon: Share2,
        run: () => {
          openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encUrl}`);
          setOpen(false);
        },
      },
      {
        id: "x",
        label: "X (Twitter)",
        icon: Share2,
        run: () => {
          openShareWindow(
            `https://twitter.com/intent/tweet?url=${encUrl}&text=${encodeURIComponent(shareTitle)}`,
          );
          setOpen(false);
        },
      },
      {
        id: "email",
        label: "Email",
        icon: Mail,
        run: () => {
          window.location.href = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encText}`;
          setOpen(false);
        },
      },
    );

    return list;
  }, [canNativeShare, copied, copyLink, shareTitle, url]);

  const heroTriggerClass =
    "inline-flex size-12 shrink-0 items-center justify-center rounded border border-white/35 bg-white/10 text-white transition-colors hover:bg-white/20";
  const defaultTriggerClass =
    "inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(variant === "hero" ? heroTriggerClass : defaultTriggerClass, className)}
          aria-label="Κοινοποίηση"
          title="Κοινοποίηση"
        >
          <Share2 className="h-5 w-5 shrink-0" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        className={cn(
          "z-[200] w-56 border p-2 shadow-xl",
          variant === "hero"
            ? "border-white/25 bg-[#1a1b4a] text-[#F0EDF8]"
            : "border-border bg-white text-foreground",
        )}
      >
        <p
          className={cn(
            "px-2 py-1.5 text-xs font-semibold",
            variant === "hero" ? "text-white/65" : "text-muted-foreground",
          )}
        >
          Κοινοποίηση
        </p>
        <ul className="flex flex-col gap-0.5" role="menu">
          {actions.map(({ id, label, icon: Icon, run }) => (
            <li key={id} role="none">
              <button
                type="button"
                role="menuitem"
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors",
                  variant === "hero"
                    ? "text-[#F0EDF8] hover:bg-white/12"
                    : "text-foreground hover:bg-muted",
                )}
                onClick={() => void run()}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    variant === "hero" ? "text-white/70" : "text-muted-foreground",
                  )}
                  aria-hidden
                />
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
