import { BookOpen, Home, Library, User } from "lucide-react";
import type { ComponentType } from "react";

export type NavItem = { href: string; label: string; icon: ComponentType<{ size?: number }> };

// Shared by AppSidebar (desktop) and AppBottomNav (mobile) so destinations,
// icons and order never drift between the two navigation surfaces. Reading
// (in-progress books) sits right after Home — it used to be a mobile-only
// destination, with desktop instead exposing the same list directly in the
// sidebar (SidebarContinueReading); now that it's a proper nav item on both
// surfaces, that sidebar shelf is gone.
export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/reading", label: "Reading", icon: BookOpen },
  { href: "/library", label: "Library", icon: Library },
  // { href: "/notes", label: "Notes", icon: MessageCircle },
  { href: "/account", label: "Account", icon: User },
];
