/** Εικονίδιο για κάτω μπάρα κινητού (Lucide). */
export type NavIconKey = "home" | "film" | "theater" | "dining" | "venues" | "user" | "none";

export type NavLinkItem = {
  label: string;
  path: string;
  icon: NavIconKey;
  showOnDesktop: boolean;
  showOnMobileTab: boolean;
};

export type MappedSiteNavigation = {
  brandTagline: string;
  desktopLinks: NavLinkItem[];
  mobileTabLinks: NavLinkItem[];
};

export const DEFAULT_SITE_NAVIGATION: MappedSiteNavigation = {
  brandTagline: "Cinema · Events · Culture",
  desktopLinks: [
    { label: "Αρχική", path: "/", icon: "home", showOnDesktop: true, showOnMobileTab: false },
    { label: "Ταινίες", path: "/movies", icon: "film", showOnDesktop: true, showOnMobileTab: true },
    { label: "Θέατρο", path: "/theater", icon: "theater", showOnDesktop: true, showOnMobileTab: true },
    { label: "Φαγητό", path: "/dining", icon: "dining", showOnDesktop: true, showOnMobileTab: true },
    { label: "Χώροι", path: "/venues", icon: "venues", showOnDesktop: true, showOnMobileTab: true },
  ],
  mobileTabLinks: [
    { label: "Ταινίες", path: "/movies", icon: "film", showOnDesktop: false, showOnMobileTab: true },
    { label: "Θέατρο", path: "/theater", icon: "theater", showOnDesktop: false, showOnMobileTab: true },
    { label: "Φαγητό", path: "/dining", icon: "dining", showOnDesktop: false, showOnMobileTab: true },
    { label: "Χώροι", path: "/venues", icon: "venues", showOnDesktop: false, showOnMobileTab: true },
  ],
};
