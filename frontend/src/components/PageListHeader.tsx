import { cn } from "@/lib/utils";
import PageHeaderReveal from "@/components/PageHeaderReveal";

/** Καθαρό κενό κάτω από fixed navbar (mobile ~4rem + safe area, desktop h-28). */
export const PAGE_NAV_CLEARANCE_CLASS =
  "pt-[max(calc(env(safe-area-inset-top,0px)+4.75rem),5.5rem)] md:pt-32";

/** Shell wrapper για σελίδες λίστας — compact offset κάτω από fixed nav. */
export const PAGE_LIST_SHELL_CLASS = "min-h-screen pb-20 md:pb-8";

/** Indigo band κάτω από navbar (λίστες, venue program, events κ.λπ.). */
export const PAGE_LIST_HERO_CLASS = cn(
  "section-black mb-6 pb-6 md:mb-8 md:pb-10",
  PAGE_NAV_CLEARANCE_CLASS,
);

/** Band για /movies (λίστα + φίλτρα / πρόγραμμα σινεμά). */
export const PAGE_MOVIES_LIST_HERO_CLASS = cn(
  "section-black mb-5 pb-5 md:mb-6 md:pb-8",
  PAGE_NAV_CLEARANCE_CLASS,
);

export const PAGE_LIST_TITLE_CLASS =
  "font-display text-2xl font-bold text-white mb-1 md:mb-2 md:text-4xl";

/** Τίτλος λίστας ταινιών — μικρότερο band, μικρότερη γραμματοσειρά. */
export const PAGE_MOVIES_LIST_TITLE_CLASS =
  "font-display text-xl font-bold text-white mb-0.5 md:mb-1 md:text-3xl";

export const PAGE_LIST_SUBTITLE_CLASS = "text-sm text-white/60 md:text-base";

/** Εσωτερικό padding για hero λεπτομέρειας (παράσταση, event). */
export const PAGE_DETAIL_HERO_INNER_CLASS = cn(
  "relative z-10 container pb-6 md:pb-8",
  PAGE_NAV_CLEARANCE_CLASS,
);

/** Hero σελίδας ταινίας — ίδιο clearance με λίστες. */
export const PAGE_MOVIE_DETAIL_HERO_INNER_CLASS = cn(
  "relative z-10 container pb-4 md:pb-6",
  PAGE_NAV_CLEARANCE_CLASS,
);

/** Loading / not-found states κάτω από navbar. */
export const PAGE_BELOW_NAV_CLASS = cn("min-h-screen", PAGE_NAV_CLEARANCE_CLASS);

type PageListHeaderProps = {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  reveal?: boolean;
};

export default function PageListHeader({
  children,
  className,
  containerClassName,
  reveal = true,
}: PageListHeaderProps) {
  const content = reveal ? <PageHeaderReveal>{children}</PageHeaderReveal> : children;
  return (
    <div className={cn(PAGE_LIST_HERO_CLASS, className)}>
      <div className={cn("container", containerClassName)}>{content}</div>
    </div>
  );
}
