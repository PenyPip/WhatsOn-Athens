import {
  Building2,
  CalendarDays,
  Film,
  Home,
  Newspaper,
  Theater,
  User,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { NavIconKey } from "@/config/navigation";

const NAV_ICONS: Record<NavIconKey, LucideIcon | null> = {
  home: Home,
  film: Film,
  theater: Theater,
  dining: UtensilsCrossed,
  venues: Building2,
  articles: Newspaper,
  events: CalendarDays,
  user: User,
  none: null,
};

export function navIconComponent(key: NavIconKey): LucideIcon {
  return NAV_ICONS[key] ?? Film;
}
