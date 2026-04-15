import { Link, useLocation } from "react-router-dom";
import { Film, Theater, UtensilsCrossed, Newspaper, User } from "lucide-react";
import { motion } from "framer-motion";

const Navbar = () => {
  const location = useLocation();

  const links = [
    { to: "/", label: "Αρχική" },
    { to: "/movies", label: "Ταινίες" },
    { to: "/theater", label: "Θέατρο" },
    { to: "/dining", label: "Φαγητό" },
    { to: "/reviews", label: "Κριτικές" },
  ];

  const mobileLinks = [
    { to: "/movies", label: "Ταινίες", icon: Film },
    { to: "/theater", label: "Θέατρο", icon: Theater },
    { to: "/dining", label: "Φαγητό", icon: UtensilsCrossed },
    { to: "/reviews", label: "Κριτικές", icon: Newspaper },
  ];

  return (
    <>
      {/* Desktop Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 hidden md:block bg-[#1a1a1a]">
        <div className="container flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-baseline gap-0.5">
            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: '2rem', letterSpacing: '-2px', color: '#F5F2ED', lineHeight: 1 }}>
              37
            </span>
            <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: '0.85rem', color: '#F5F2ED', alignSelf: 'flex-start', marginTop: '6px' }}>
              °
            </span>
            <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: '0.85rem', fontWeight: 700, color: '#C8512A', alignSelf: 'flex-end', marginBottom: '4px', letterSpacing: '1px' }}>
              N
            </span>
            <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: '0.55rem', letterSpacing: '4px', color: 'rgba(245,242,237,0.35)', marginLeft: '8px', alignSelf: 'center', textTransform: 'uppercase' }}>
              Athens
            </span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm transition-colors relative ${
                  location.pathname === link.to ? "text-white" : "text-white/60 hover:text-white"
                }`}
                style={{ fontFamily: 'Courier Prime, monospace' }}
              >
                {link.label}
                {location.pathname === link.to && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5"
                    style={{ background: '#C8512A' }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>

          <Link to="/profile" className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <User className="w-4 h-4 text-white/60" />
          </Link>
        </div>
      </nav>

      {/* Categories bar */}
      <div className="fixed top-14 left-0 right-0 z-40 hidden md:block bg-[#F5F2ED] border-b border-black/10">
        <div className="container flex items-center gap-6 h-10" style={{ fontFamily: 'Courier Prime, monospace', fontSize: '0.65rem', letterSpacing: '3px', textTransform: 'uppercase' }}>
          <span className="text-black/30">Εξερεύνησε:</span>
          {["Δράμα", "Κωμωδία", "Μιούζικαλ", "Νέα Μέρη", "Κριτικές"].map((cat) => (
            <span key={cat} className="text-black/60 hover:text-black cursor-pointer transition-colors">{cat}</span>
          ))}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#1a1a1a] border-t border-white/10">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex flex-col items-center gap-1 text-xs transition-colors ${
                  isActive ? "text-[#C8512A]" : "text-white/50"
                }`}
                style={{ fontFamily: 'Courier Prime, monospace' }}
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
          <Link
            to="/profile"
            className={`flex flex-col items-center gap-1 text-xs transition-colors ${
              location.pathname === "/profile" ? "text-[#C8512A]" : "text-white/50"
            }`}
            style={{ fontFamily: 'Courier Prime, monospace' }}
          >
            <User className="w-5 h-5" />
            <span>Προφίλ</span>
          </Link>
        </div>
      </nav>
    </>
  );
};

export default Navbar;