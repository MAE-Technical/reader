import { Home, Library, MessageCircle, User } from "lucide-react";
import type { ComponentType } from "react";

export type NavItem = { href: string; label: string; icon: ComponentType<{ size?: number }> };

// Shared by AppSidebar (desktop) and AppBottomNav (mobile) so the four
// destinations and their icons never drift between the two.
export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/library", label: "Library", icon: Library },
  // { href: "/notes", label: "Notes", icon: MessageCircle },
  { href: "/account", label: "Account", icon: User },
];
