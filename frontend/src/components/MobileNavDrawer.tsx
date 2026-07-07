import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Menu, User, X } from "lucide-react";
import type { NavLinkItem } from "@/config/navigation";
import { navIconComponent } from "@/lib/navIcons";
import { isNavLinkActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const NAV_GRADIENT =
  "linear-gradient(95deg, #742374 0%, #872F8B 18%, #7A2D84 34%, #5A286F 56%, #382154 76%, #13143E 100%)";

type MobileNavDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: NavLinkItem[];
  pathname: string;
  brandTagline: string;
};

export function MobileNavMenuButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md p-2 text-white/90 transition-colors hover:bg-white/10 hover:text-white",
        className,
      )}
      aria-label="Άνοιγμα μενού"
    >
      <Menu className="h-6 w-6" aria-hidden />
    </button>
  );
}

export default function MobileNavDrawer({
  open,
  onOpenChange,
  links,
  pathname,
  brandTagline,
}: MobileNavDrawerProps) {
  useEffect(() => {
    onOpenChange(false);
    // Κλείσιμο μετά από navigation — μόνο όταν αλλάζει path
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] md:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Κλείσιμο μενού"
        onClick={() => onOpenChange(false)}
      />
      <nav
        className="absolute inset-y-0 right-0 flex w-[min(100%,19.5rem)] flex-col border-l border-white/10 shadow-2xl"
        style={{ background: NAV_GRADIENT }}
        aria-label="Πλήρες μενού"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <p className="font-brand text-lg font-light tracking-[-1px] text-[#F0EDF8]">37°N</p>
            <p className="truncate font-body text-[10px] uppercase tracking-[0.18em] text-white/55">
              {brandTagline}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="shrink-0 rounded-md p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Κλείσιμο μενού"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto px-3 py-4">
          {links.map((link) => {
            const Icon = navIconComponent(link.icon);
            const active = isNavLinkActive(pathname, link.path);
            return (
              <li key={link.path}>
                <Link
                  to={link.path}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "font-body flex items-center gap-3 rounded-lg px-3 py-3.5 text-base transition-colors",
                    active ? "bg-white/12 font-semibold text-white" : "text-white/78 hover:bg-white/8 hover:text-white",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0 opacity-85" aria-hidden />
                  <span>{link.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="mt-2 border-t border-white/10 pt-2">
            <Link
              to="/profile"
              onClick={() => onOpenChange(false)}
              className={cn(
                "font-body flex items-center gap-3 rounded-lg px-3 py-3.5 text-base transition-colors",
                pathname === "/profile"
                  ? "bg-white/12 font-semibold text-white"
                  : "text-white/78 hover:bg-white/8 hover:text-white",
              )}
            >
              <User className="h-5 w-5 shrink-0 opacity-85" aria-hidden />
              <span>Προφίλ</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>,
    document.body,
  );
}
