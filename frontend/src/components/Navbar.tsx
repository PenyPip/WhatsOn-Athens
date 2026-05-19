import { Link, useLocation } from "react-router-dom";
import { Film, Theater, UtensilsCrossed, Building2, User, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { GlobalSearch, useGlobalSearchShortcut } from "@/components/GlobalSearch";
import { SHOW_PROFILE_IN_NAV } from "@/lib/siteVisibility";

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

  return (
    <>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Mobile: ταχύπληρο κέντρο αναζήτησης πάνω από το bottom nav */}
      <button
        type="button"
        aria-label="Άνοιγμα αναζήτησης ταινιών και χώρων"
        onClick={() => setSearchOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-[#382154]/95 text-white shadow-lg backdrop-blur-sm transition hover:bg-[#4a2d6e] md:hidden"
        style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}
      >
        <Search className="h-6 w-6" aria-hidden />
      </button>

      {/* Desktop Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 hidden md:block"
        style={{
          background:
            "linear-gradient(95deg, #742374 0%, #872F8B 18%, #7A2D84 34%, #5A286F 56%, #382154 76%, #13143E 100%)",
        }}
      >
        <div className="container flex h-28 items-center gap-4">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-4">
            <div className="flex items-baseline gap-0.5">
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 300, fontSize: '3rem', color: '#F0EDF8', letterSpacing: '-3px', lineHeight: 1 }}>
                37
              </span>
              <sup style={{ fontFamily: '"Literata", Georgia, serif', fontStyle: 'italic', fontWeight: 400, fontSize: '1.4rem', color: 'rgba(240,237,248,0.7)', verticalAlign: 'super' }}>°N</sup>
            </div>
            <div className="flex flex-col gap-1" style={{ borderLeft: '1px solid rgba(240,237,248,0.2)', paddingLeft: '16px' }}>
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.8rem', color: '#FFFFFF', letterSpacing: '3px' }}>ATHENS GUIDE</span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontSize: '0.72rem', color: 'rgba(240,237,248,0.65)', letterSpacing: '2.5px', textTransform: 'uppercase' }}>Cinema · Events · Culture</span>
            </div>
          </Link>

          <div className="hidden min-w-0 flex-1 justify-center px-2 md:flex">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-11 w-full max-w-md cursor-pointer items-center gap-3 rounded-full border border-white/20 bg-black/25 px-4 text-left text-sm text-white/70 transition hover:border-white/35 hover:bg-black/35 hover:text-white"
            >
              <Search className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-body text-white/55">Ταινίες, χώροι…</span>
            </button>
          </div>

          <div className="flex flex-1 items-center justify-end gap-4 md:contents">
            {/* Links */}
            <div className="flex items-center gap-6 md:gap-8">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-base transition-colors relative ${
                  location.pathname === link.to ? "text-white" : "text-white/60 hover:text-white"
                }`}
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {link.label}
                {location.pathname === link.to && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5"
                    style={{ background: 'linear-gradient(110deg, #7C2B76, #1C1D62)' }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            ))}
            </div>

            {SHOW_PROFILE_IN_NAV ? (
              <Link to="/profile" className="shrink-0 p-2 rounded-full hover:bg-white/10 transition-colors">
                <User className="w-5 h-5 text-white/60" />
              </Link>
            ) : null}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t"
        style={{
          background:
            "linear-gradient(95deg, #742374 0%, #872F8B 18%, #7A2D84 34%, #5A286F 56%, #382154 76%, #13143E 100%)",
          borderColor: "rgba(141,47,143,0.35)",
        }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {mobileLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="flex flex-col items-center gap-1 text-xs transition-colors"
                style={{ color: isActive ? '#B47EC8' : 'rgba(240,237,248,0.5)', fontFamily: 'DM Sans, sans-serif' }}
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
          {SHOW_PROFILE_IN_NAV ? (
            <Link
              to="/profile"
              className="flex flex-col items-center gap-1 text-xs transition-colors"
              style={{ color: location.pathname === "/profile" ? '#B47EC8' : 'rgba(240,237,248,0.5)', fontFamily: 'DM Sans, sans-serif' }}
            >
              <User className="w-5 h-5" />
              <span>Προφίλ</span>
            </Link>
          ) : null}
        </div>
      </nav>
    </>
  );
};

export default Navbar;