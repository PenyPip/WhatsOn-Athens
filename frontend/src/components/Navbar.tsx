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
      <nav
        className="fixed top-0 left-0 right-0 z-50 hidden md:block"
        style={{
          background:
            "linear-gradient(95deg, #742374 0%, #872F8B 18%, #7A2D84 34%, #5A286F 56%, #382154 76%, #13143E 100%)",
        }}
      >
        <div className="container flex items-center justify-between h-28">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-4">
            <div className="flex items-baseline gap-0.5">
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 300, fontSize: '3rem', color: '#F0EDF8', letterSpacing: '-3px', lineHeight: 1 }}>
                37
              </span>
              <sup style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontWeight: 300, fontSize: '1.4rem', color: 'rgba(240,237,248,0.7)', verticalAlign: 'super' }}>°N</sup>
            </div>
            <div className="flex flex-col gap-1" style={{ borderLeft: '1px solid rgba(240,237,248,0.2)', paddingLeft: '16px' }}>
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.8rem', color: '#FFFFFF', letterSpacing: '3px' }}>ATHENS GUIDE</span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontSize: '0.72rem', color: 'rgba(240,237,248,0.65)', letterSpacing: '2.5px', textTransform: 'uppercase' }}>Cinema · Events · Culture</span>
            </div>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-8">
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

          <Link to="/profile" className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <User className="w-5 h-5 text-white/60" />
          </Link>
        </div>
      </nav>

      {/* Categories bar */}
      <div className="fixed top-28 left-0 right-0 z-40 hidden md:block border-b" style={{ background: '#F0EDF8', borderColor: 'rgba(28,29,98,0.1)' }}>
        <div className="container flex items-center gap-6 h-10" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.65rem', letterSpacing: '3px', textTransform: 'uppercase' }}>
          <span style={{ color: 'rgba(28,29,98,0.35)' }}>Εξερεύνησε:</span>
          {["Δράμα", "Κωμωδία", "Μιούζικαλ", "Νέα Μέρη", "Κριτικές"].map((cat) => (
            <span key={cat} className="cursor-pointer transition-opacity hover:opacity-100" style={{ color: 'rgba(28,29,98,0.65)' }}>{cat}</span>
          ))}
        </div>
      </div>

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
          <Link
            to="/profile"
            className="flex flex-col items-center gap-1 text-xs transition-colors"
            style={{ color: location.pathname === "/profile" ? '#B47EC8' : 'rgba(240,237,248,0.5)', fontFamily: 'DM Sans, sans-serif' }}
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