import { lazy, Suspense, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Film, Theater, UtensilsCrossed, Building2, User, Search } from "lucide-react";
import { useGlobalSearchShortcut } from "@/hooks/globalSearchShortcut";

const GlobalSearch = lazy(() =>
  import("@/components/GlobalSearch").then((m) => ({ default: m.GlobalSearch })),
);
import { SHOW_PROFILE_IN_NAV } from "@/lib/siteVisibility";

const NAV_GRADIENT =
  "linear-gradient(95deg, #742374 0%, #872F8B 18%, #7A2D84 34%, #5A286F 56%, #382154 76%, #13143E 100%)";

function BrandLogo({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2">
        <div className="flex items-baseline gap-0.5">
          <span
            style={{
              fontFamily: "Unbounded, sans-serif",
              fontWeight: 300,
              fontSize: "1.65rem",
              color: "#F0EDF8",
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            37
          </span>
          <sup
            style={{
              fontFamily: '"Literata", Georgia, serif',
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "0.75rem",
              color: "rgba(240,237,248,0.7)",
              verticalAlign: "super",
            }}
          >
            °N
          </sup>
        </div>
        <span
          className="hidden min-[380px]:block truncate"
          style={{
            fontFamily: "Unbounded, sans-serif",
            fontWeight: 700,
            fontSize: "0.55rem",
            color: "#FFFFFF",
            letterSpacing: "2.5px",
          }}
        >
          ATHENS GUIDE
        </span>
      </Link>
    );
  }

  return (
    <Link to="/" className="flex shrink-0 items-center gap-4">
      <div className="flex items-baseline gap-0.5">
        <span
          style={{
            fontFamily: "Unbounded, sans-serif",
            fontWeight: 300,
            fontSize: "3rem",
            color: "#F0EDF8",
            letterSpacing: "-3px",
            lineHeight: 1,
          }}
        >
          37
        </span>
        <sup
          style={{
            fontFamily: '"Literata", Georgia, serif',
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: "1.4rem",
            color: "rgba(240,237,248,0.7)",
            verticalAlign: "super",
          }}
        >
          °N
        </sup>
      </div>
      <div
        className="flex flex-col gap-1"
        style={{ borderLeft: "1px solid rgba(240,237,248,0.2)", paddingLeft: "16px" }}
      >
        <span
          style={{
            fontFamily: "Unbounded, sans-serif",
            fontWeight: 700,
            fontSize: "0.8rem",
            color: "#FFFFFF",
            letterSpacing: "3px",
          }}
        >
          ATHENS GUIDE
        </span>
        <span
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 400,
            fontSize: "0.72rem",
            color: "rgba(240,237,248,0.65)",
            letterSpacing: "2.5px",
            textTransform: "uppercase",
          }}
        >
          Cinema · Events · Culture
        </span>
      </div>
    </Link>
  );
}

function NavSearchTrigger({
  onClick,
  className = "",
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Άνοιγμα αναζήτησης ταινιών και χώρων"
      className={`flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-black/25 text-left text-white/70 transition hover:border-white/35 hover:bg-black/35 hover:text-white ${className}`}
    >
      <Search className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
      <span className="min-w-0 flex-1 truncate font-body text-white/55">Ταινίες, χώροι…</span>
    </button>
  );
}

const Navbar = () => {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  useGlobalSearchShortcut(setSearchOpen);

  const links = [
    { to: "/", label: "Αρχική" },
    { to: "/movies", label: "Ταινίες" },
    { to: "/theater", label: "Θέατρο" },
    { to: "/dining", label: "Φαγητό" },
    { to: "/venues", label: "Χώροι" },
  ];

  const mobileLinks = [
    { to: "/movies", label: "Ταινίες", icon: Film },
    { to: "/theater", label: "Θέατρο", icon: Theater },
    { to: "/dining", label: "Φαγητό", icon: UtensilsCrossed },
    { to: "/venues", label: "Χώροι", icon: Building2 },
  ];

  const mobileTabCount = mobileLinks.length + (SHOW_PROFILE_IN_NAV ? 1 : 0);

  return (
    <>
      {searchOpen ? (
        <Suspense fallback={null}>
          <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
        </Suspense>
      ) : null}

      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b md:hidden"
        style={{ background: NAV_GRADIENT, borderColor: "rgba(141,47,143,0.35)" }}
      >
        <div className="container flex min-h-14 items-center gap-2.5 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <BrandLogo compact />
          <NavSearchTrigger onClick={() => setSearchOpen(true)} className="h-9 min-w-0 flex-1 px-3 text-xs" />
        </div>
      </nav>

      <nav className="fixed top-0 left-0 right-0 z-50 hidden md:block" style={{ background: NAV_GRADIENT }}>
        <div className="container flex h-28 items-center gap-4">
          <BrandLogo />

          <div className="hidden min-w-0 flex-1 justify-center px-2 md:flex">
            <NavSearchTrigger onClick={() => setSearchOpen(true)} className="h-11 w-full max-w-md px-4 text-sm" />
          </div>

          <div className="flex flex-1 items-center justify-end gap-4 md:contents">
            <div className="flex items-center gap-6 md:gap-8">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative text-base transition-colors ${
                    location.pathname === link.to ? "text-white" : "text-white/60 hover:text-white"
                  }`}
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  {link.label}
                  {location.pathname === link.to ? (
                    <span
                      className="absolute -bottom-1 left-0 right-0 h-0.5"
                      style={{ background: "linear-gradient(110deg, #7C2B76, #1C1D62)" }}
                      aria-hidden
                    />
                  ) : null}
                </Link>
              ))}
            </div>

            {SHOW_PROFILE_IN_NAV ? (
              <Link to="/profile" className="shrink-0 rounded-full p-2 transition-colors hover:bg-white/10">
                <User className="h-5 w-5 text-white/60" />
              </Link>
            ) : null}
          </div>
        </div>
      </nav>

      <nav className="mobile-bottom-nav md:hidden" aria-label="Κύρια πλοήγηση κινητού">
        <div
          className="mobile-bottom-nav__inner mx-auto grid w-full max-w-full items-stretch px-1"
          style={{
            background: NAV_GRADIENT,
            gridTemplateColumns: `repeat(${mobileTabCount}, minmax(0, 1fr))`,
          }}
        >
          {mobileLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-center transition-colors"
                style={{
                  color: isActive ? "#B47EC8" : "rgba(240,237,248,0.5)",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.25 : 2} />
                <span className="w-full truncate text-[10px] leading-none">{link.label}</span>
              </Link>
            );
          })}
          {SHOW_PROFILE_IN_NAV ? (
            <Link
              to="/profile"
              className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-center transition-colors"
              style={{
                color: location.pathname === "/profile" ? "#B47EC8" : "rgba(240,237,248,0.5)",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              <User className="h-5 w-5 shrink-0" strokeWidth={location.pathname === "/profile" ? 2.25 : 2} />
              <span className="w-full truncate text-[10px] leading-none">Προφίλ</span>
            </Link>
          ) : null}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
