import {
  Building2,
  Film,
  Home,
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
  user: User,
  none: null,
};

export function navIconComponent(key: NavIconKey): LucideIcon {
  return NAV_ICONS[key] ?? Film;
}
