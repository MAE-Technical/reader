"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Moon, Sun } from "lucide-react";
import { NAV_ITEMS } from "./navItems";
import { useReaderStore } from "@/stores/reader-store";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Persistent desktop nav rail — hidden below the same 860px breakpoint
 * ChaptersDrawer/Reader.tsx's notes panel already use for "does this layout
 * have room to push sideways", so AppBottomNav (mobile) takes over below it.
 */
export default function AppSidebar() {
  const pathname = usePathname();
  const theme = useReaderStore((s) => s.theme);
  const setTheme = useReaderStore((s) => s.setTheme);

  return (
    <aside className="hidden min-[860px]:flex fixed left-0 top-0 h-full w-[var(--app-sidebar-w)] z-30 flex-col box-border border-r border-[var(--reader-border)] bg-[var(--reader-surface)] select-none no-callout">
      <Link href="/home" className="px-6 pt-6 pb-4 flex-none no-underline">
        <span className="text-xl font-serif font-bold text-brand-500">Ominira</span>
      </Link>

      <nav className="flex-1 min-h-0 overflow-y-auto px-3 pt-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md mb-3 no-underline text-sm font-semibold transition-colors ${
                active
                  ? "bg-brand-500/10 text-brand-500"
                  : "text-[var(--reader-text-muted)] hover:bg-[var(--reader-surface-hover)]"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-none px-3 pb-6 pt-2 border-t border-[var(--reader-border)]">
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border-none bg-transparent cursor-pointer text-sm font-semibold text-[var(--reader-text-muted)] hover:bg-[var(--reader-surface-hover)]"
        >
          {theme === "light" ? <Sun size={18} /> : <Moon size={18} />}
          {theme === "light" ? "Light mode" : "Dark mode"}
        </button>

        {/* Inert — there's no auth/session system yet (reader-identity-store
            is anonymous device identity, not an account), so there's nothing
            to actually sign out of. Kept visible per the wireframe rather
            than removed, just not wired to a real flow yet. */}
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border-none bg-transparent cursor-pointer text-sm font-semibold text-[var(--reader-text-muted)] hover:bg-[var(--reader-surface-hover)]">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
