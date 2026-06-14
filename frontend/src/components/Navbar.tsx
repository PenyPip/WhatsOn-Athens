import { lazy, Suspense, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIdleMount } from "@/hooks/useIdleMount";
import { useDeferUntilLcpDone } from "@/hooks/useDeferUntilLcpDone";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStableMobileSafeArea } from "@/hooks/useStableMobileSafeArea";
import { Link, useLocation } from "react-router-dom";
import { User } from "lucide-react";
import { useSiteNavigationData } from "@/hooks/useStrapi";
import { isNavLinkActive } from "@/lib/navigation";
import { navIconComponent } from "@/lib/navIcons";
import type { NavSearchHandle } from "@/components/GlobalSearch";
import MobileNavDrawer, { MobileNavMenuButton } from "@/components/MobileNavDrawer";
import { SHOW_PROFILE_IN_NAV } from "@/lib/siteVisibility";

const NavSearch = lazy(() =>
  import("@/components/GlobalSearch").then((m) => ({ default: m.NavSearch })),
);

function NavSearchFallback({ className = "" }: { className?: string }) {
  return <div className={`rounded-md bg-white/10 ${className}`} aria-hidden />;
}

const NAV_GRADIENT =
  "linear-gradient(95deg, #742374 0%, #872F8B 18%, #7A2D84 34%, #5A286F 56%, #382154 76%, #13143E 100%)";

function BrandLogo({ compact = false, tagline }: { compact?: boolean; tagline: string }) {
  if (compact) {
    return (
      <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2">
        <div className="flex items-baseline gap-0.5">
          <span className="font-brand text-[1.65rem] font-light leading-none tracking-[-2px] text-[#F0EDF8]">
            37
          </span>
          <sup className="font-display text-[0.75rem] font-normal not-italic text-[#F0EDF8]/70 align-super">
            °N
          </sup>
        </div>
        <span className="font-brand hidden min-[380px]:block truncate text-[0.55rem] font-bold tracking-[2.5px] text-white">
          ATHENS GUIDE
        </span>
      </Link>
    );
  }

  return (
    <Link to="/" className="flex shrink-0 items-center gap-4">
      <div className="flex items-baseline gap-0.5">
        <span className="font-brand text-5xl font-light leading-none tracking-[-3px] text-[#F0EDF8] md:text-[3rem]">
          37
        </span>
        <sup className="font-display text-[1.4rem] font-normal not-italic text-[#F0EDF8]/70 align-super">
          °N
        </sup>
      </div>
      <div
        className="flex flex-col gap-1"
        style={{ borderLeft: "1px solid rgba(240,237,248,0.2)", paddingLeft: "16px" }}
      >
        <span className="font-brand text-[0.8rem] font-bold tracking-[3px] text-white">
          ATHENS GUIDE
        </span>
        <span className="font-body text-[0.72rem] font-normal uppercase tracking-[2.5px] text-[#F0EDF8]/65">
          {tagline}
        </span>
      </div>
    </Link>
  );
}

const Navbar = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileSearchRef = useRef<NavSearchHandle>(null);
  const desktopSearchRef = useRef<NavSearchHandle>(null);
  const deferNav = useDeferUntilLcpDone();
  const onHome = location.pathname === "/";
  const showSearch =
    useIdleMount(isMobile ? 4500 : onHome ? 4500 : 2500) && (!isMobile || !onHome || deferNav);
  useStableMobileSafeArea();
  const nav = useSiteNavigationData(!isMobile || deferNav);

  const desktopLinks = nav.desktopLinks;
  const mobileTabLinks = nav.mobileTabLinks;
  const mobileTabCount = mobileTabLinks.length + (SHOW_PROFILE_IN_NAV ? 1 : 0);
  const mobileBottomNav = (
    <nav className="mobile-bottom-nav md:hidden" aria-label="Κύρια πλοήγηση κινητού">
      <div
        className="mobile-bottom-nav__inner mx-auto w-full max-w-full px-1"
        style={{ gridTemplateColumns: `repeat(${mobileTabCount}, minmax(0, 1fr))` }}
      >
        {mobileTabLinks.map((link) => {
          const Icon = navIconComponent(link.icon);
          const isActive = isNavLinkActive(location.pathname, link.path);
          return (
            <Link
              key={link.path}
              to={link.path}
              className="mobile-bottom-nav__tab transition-colors"
              style={{ color: isActive ? "#B47EC8" : "rgba(240,237,248,0.72)" }}
            >
              <Icon strokeWidth={isActive ? 2.25 : 2} aria-hidden />
              <span>{link.label}</span>
            </Link>
          );
        })}
        {SHOW_PROFILE_IN_NAV ? (
          <Link
            to="/profile"
            className="mobile-bottom-nav__tab transition-colors"
            style={{
              color: location.pathname === "/profile" ? "#B47EC8" : "rgba(240,237,248,0.5)",
            }}
          >
            <User strokeWidth={location.pathname === "/profile" ? 2.25 : 2} aria-hidden />
            <span>Προφίλ</span>
          </Link>
        ) : null}
      </div>
    </nav>
  );

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-[60] border-b md:hidden"
        style={{ background: NAV_GRADIENT, borderColor: "rgba(141,47,143,0.35)" }}
      >
        <div className="container flex min-h-14 items-center gap-2.5 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <BrandLogo compact tagline={nav.brandTagline} />
          {showSearch ? (
            <Suspense fallback={<NavSearchFallback className="h-9 min-w-0 flex-1" />}>
              <NavSearch
                ref={mobileSearchRef}
                className="min-w-0 flex-1"
                inputClassName="h-9 text-xs"
              />
            </Suspense>
          ) : (
            <NavSearchFallback className="h-9 min-w-0 flex-1" />
          )}
          <MobileNavMenuButton onClick={() => setMobileMenuOpen(true)} />
        </div>
      </nav>

      <MobileNavDrawer
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        links={desktopLinks}
        pathname={location.pathname}
        brandTagline={nav.brandTagline}
      />

      <nav className="fixed top-0 left-0 right-0 z-[60] hidden md:block" style={{ background: NAV_GRADIENT }}>
        <div className="container flex h-28 items-center gap-4">
          <BrandLogo tagline={nav.brandTagline} />

          <div className="hidden min-w-0 flex-1 justify-center px-2 md:flex">
            {showSearch ? (
              <Suspense fallback={<NavSearchFallback className="h-11 w-full max-w-md" />}>
                <NavSearch
                  ref={desktopSearchRef}
                  className="w-full max-w-md"
                  inputClassName="h-11 text-sm"
                />
              </Suspense>
            ) : (
              <NavSearchFallback className="h-11 w-full max-w-md" />
            )}
          </div>

          <div className="flex flex-1 items-center justify-end gap-4 md:contents">
            <div className="flex items-center gap-6 md:gap-8">
              {desktopLinks.map((link) => {
                const active = isNavLinkActive(location.pathname, link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`font-body relative text-base transition-colors ${
                      active ? "text-white" : "text-white/75 hover:text-white"
                    }`}
                  >
                    {link.label}
                    {active ? (
                      <span
                        className="absolute -bottom-1 left-0 right-0 h-0.5"
                        style={{ background: "linear-gradient(110deg, #7C2B76, #1C1D62)" }}
                        aria-hidden
                      />
                    ) : null}
                  </Link>
                );
              })}
            </div>

            {SHOW_PROFILE_IN_NAV ? (
              <Link
                to="/profile"
                aria-label="Προφίλ"
                className="shrink-0 rounded-full p-2 transition-colors hover:bg-white/10"
              >
                <User className="h-5 w-5 text-white/60" aria-hidden />
              </Link>
            ) : null}
          </div>
        </div>
      </nav>

      {typeof document !== "undefined" && (!isMobile || deferNav)
        ? createPortal(mobileBottomNav, document.body)
        : null}
    </>
  );
};

export default Navbar;
