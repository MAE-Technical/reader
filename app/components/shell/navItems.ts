import { BookOpen, Home, Library, User } from "lucide-react";
import type { ComponentType } from "react";

export type NavItem = { href: string; label: string; icon: ComponentType<{ size?: number }> };

// Shared by AppSidebar (desktop) and AppBottomNav (mobile) so destinations
// and icons never drift between the two navigation surfaces.
export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/library", label: "Library", icon: Library },
  // { href: "/notes", label: "Notes", icon: MessageCircle },
  { href: "/account", label: "Account", icon: User },
];

// Reading is a dedicated mobile destination; desktop exposes the same list
// directly beneath its main navigation instead.
export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS.flatMap((item) => {
  return item.href === "/library" ? [item, { href: "/books", label: "Books", icon: BookOpen }] : [item];
});
