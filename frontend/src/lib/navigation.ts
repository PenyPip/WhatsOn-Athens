import {
  DEFAULT_SITE_NAVIGATION,
  type MappedSiteNavigation,
  type NavIconKey,
  type NavLinkItem,
} from "@/config/navigation";

const NAV_ICON_KEYS = new Set<NavIconKey>([
  "home",
  "film",
  "theater",
  "dining",
  "venues",
  "articles",
  "events",
  "user",
  "none",
]);

function normalizeNavIcon(raw: unknown): NavIconKey {
  const k = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return NAV_ICON_KEYS.has(k as NavIconKey) ? (k as NavIconKey) : "none";
}

function normalizeNavPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t.startsWith("/")) return null;
  if (t.includes("://")) return null;
  return t.replace(/\/+$/, "") || "/";
}

function mapNavItemRow(row: unknown): NavLinkItem | null {
  if (typeof row !== "object" || row === null || Array.isArray(row)) return null;
  const o = row as Record<string, unknown>;
  const label = typeof o.label === "string" ? o.label.trim() : "";
  const path = normalizeNavPath(o.path);
  if (!label || !path) return null;
  return {
    label,
    path,
    icon: normalizeNavIcon(o.icon),
    showOnDesktop: o.show_on_desktop !== false,
    showOnMobileTab: o.show_on_mobile_tab === true,
  };
}

function mapNavItems(items: unknown): NavLinkItem[] {
  if (!Array.isArray(items)) return [];
  const out: NavLinkItem[] = [];
  const seen = new Set<string>();
  for (const row of items) {
    const item = mapNavItemRow(row);
    if (!item || seen.has(item.path)) continue;
    seen.add(item.path);
    out.push(item);
  }
  return out;
}

export function resolveSiteNavigation(attrs: Record<string, unknown> | null | undefined): MappedSiteNavigation {
  if (!attrs) return DEFAULT_SITE_NAVIGATION;

  const all = mapNavItems(attrs.items);
  if (all.length === 0) return DEFAULT_SITE_NAVIGATION;

  const desktopLinks = all.filter((i) => i.showOnDesktop);
  const mobileTabLinks = all.filter((i) => i.showOnMobileTab);

  const taglineRaw = attrs.brand_tagline;
  const brandTagline =
    typeof taglineRaw === "string" && taglineRaw.trim()
      ? taglineRaw.trim()
      : DEFAULT_SITE_NAVIGATION.brandTagline;

  return {
    brandTagline,
    desktopLinks: desktopLinks.length > 0 ? desktopLinks : DEFAULT_SITE_NAVIGATION.desktopLinks,
    mobileTabLinks: mobileTabLinks.length > 0 ? mobileTabLinks : DEFAULT_SITE_NAVIGATION.mobileTabLinks,
  };
}

/** Ενεργός σύνδεσμος: ακριβές `/` ή prefix για υποσελίδες. */
export function isNavLinkActive(pathname: string, path: string): boolean {
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}
