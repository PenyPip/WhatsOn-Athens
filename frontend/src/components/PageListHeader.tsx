import { cn } from "@/lib/utils";
import PageHeaderReveal from "@/components/PageHeaderReveal";

/** Shell wrapper για σελίδες λίστας — compact offset κάτω από fixed nav. */
export const PAGE_LIST_SHELL_CLASS = "min-h-screen pb-20 md:pb-8";

/** Compact indigo band κάτω από navbar (ίδιο με /movies, /theater). */
export const PAGE_LIST_HERO_CLASS =
  "section-black mb-6 max-md:-mt-16 max-md:py-5 max-md:pt-20 md:-mt-28 md:mb-8 md:py-10 md:pt-36";

export const PAGE_LIST_TITLE_CLASS =
  "font-display text-2xl font-bold text-white mb-1 md:mb-2 md:text-4xl";

export const PAGE_LIST_SUBTITLE_CLASS = "text-sm text-white/60 md:text-base";

/** Εσωτερικό padding για hero λεπτομέρειας (ταινία, παράσταση, event). */
export const PAGE_DETAIL_HERO_INNER_CLASS =
  "relative z-10 container pb-6 pt-20 md:pb-10 md:pt-32 lg:pt-36";

/** Loading / not-found states κάτω από navbar. */
export const PAGE_BELOW_NAV_CLASS = "min-h-screen pt-20 md:pt-28";

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
