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
      {/* Desktop Nav — Black bar like TheNudge */}
      <nav className="fixed top-0 left-0 right-0 z-50 hidden md:block bg-[#111111]">
        <div className="container flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-lg font-bold text-white tracking-tight">WhatSON</span>
            <span className="text-white/40 text-xs font-body uppercase tracking-widest">Athens</span>
          </Link>
          <div className="flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors relative ${
                  location.pathname === link.to ? "text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {link.label}
                {location.pathname === link.to && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white"
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

      {/* Categories bar — second row */}
      <div className="fixed top-14 left-0 right-0 z-40 hidden md:block bg-white border-b border-foreground/10">
        <div className="container flex items-center gap-6 h-10 text-xs font-medium uppercase tracking-wider">
          <span className="text-muted-foreground">Εξερεύνησε:</span>
          {["Δράμα", "Κωμωδία", "Μιούζικαλ", "Νέα Μέρη", "Κριτικές Συντακτών"].map((cat) => (
            <span key={cat} className="text-foreground/70 hover:text-foreground cursor-pointer transition-colors">{cat}</span>
          ))}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#111111] border-t border-white/10">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex flex-col items-center gap-1 text-xs transition-colors ${
                  isActive ? "text-white" : "text-white/50"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
          <Link
            to="/profile"
            className={`flex flex-col items-center gap-1 text-xs transition-colors ${
              location.pathname === "/profile" ? "text-white" : "text-white/50"
            }`}
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
