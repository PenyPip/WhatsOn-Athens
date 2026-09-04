"use client";

import { cn } from "@/lib/utils";
import TheaterShowMoreLink from "@/components/TheaterShowMoreLink";
import type { StrapiTheaterShow } from "@/lib/api";

type MobileDetailStickyCtaProps = {
  kind: "movie" | "theater";
  scheduleHref: string;
  scheduleLabel: string;
  theaterShow?: Pick<StrapiTheaterShow, "moreLink"> | null;
  className?: string;
};

/** Σταθερό CTA πάνω από το mobile tab bar - περισσότερα taps σε προβολές/κράτηση. */
export default function MobileDetailStickyCta({
  kind,
  scheduleHref,
  scheduleLabel,
  theaterShow,
  className,
}: MobileDetailStickyCtaProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-40 border-t border-border/60 bg-background/95 px-3 py-2 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur-md md:hidden",
        "bottom-[calc(var(--mobile-tab-bar-h)+var(--mobile-safe-bottom-fixed))]",
        className,
      )}
    >
      <div className="mx-auto flex max-w-lg items-center gap-2">
        <a
          href={scheduleHref}
          className="inline-flex flex-1 items-center justify-center rounded-lg bg-[#13143E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          {scheduleLabel}
        </a>
        {kind === "theater" && theaterShow ? (
          <TheaterShowMoreLink
            show={theaterShow}
            variant="button"
            label="Εισιτήρια"
            className="shrink-0 !px-3 !py-2.5"
          />
        ) : null}
      </div>
    </div>
  );
}
