import { Link, useLocation } from "react-router-dom";
import { Film, Theater, MapPin, Search } from "lucide-react";

const Navbar = () => {
  const location = useLocation();

  const links = [
    { to: "/", label: "Home", icon: null },
    { to: "/movies", label: "Movies", icon: Film },
    { to: "/theater", label: "Theater", icon: Theater },
    { to: "/venues", label: "Venues", icon: MapPin },
  ];

  return (
    <>
      {/* Desktop Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 hidden md:block">
        <div className="glass-card border-b border-[var(--glass-border)]">
          <div className="container flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <span className="font-display text-xl font-bold text-gradient-gold">WhatSON</span>
              <span className="text-muted-foreground text-sm font-body">Athens</span>
            </Link>
            <div className="flex items-center gap-8">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location.pathname === link.to ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <Search className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-card border-t border-[var(--glass-border)]">
        <div className="flex items-center justify-around h-16 px-4">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex flex-col items-center gap-1 text-xs transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {Icon ? <Icon className="w-5 h-5" /> : <span className="text-lg font-display font-bold">W</span>}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
