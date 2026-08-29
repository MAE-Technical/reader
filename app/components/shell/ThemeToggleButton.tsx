"use client";

import { Moon, Sun } from "lucide-react";
import { useReaderStore } from "@/stores/reader-store";
import Tooltip from "@/app/components/reader/Tooltip";

/**
 * Single-icon theme switch for AppHeader, sized to match NotificationsMenu's
 * bell button next to it. Shows the icon for the theme a click would switch
 * *to* (moon while light, sun while dark) rather than the active theme's own
 * icon — distinct from ThemeToggle's segmented sun/moon pair (AccountView),
 * which shows both options at once and highlights the active one.
 *
 * Borderless (unlike the bell) so the two don't double up on the same ring
 * treatment right next to each other — the bell keeps its border as the
 * popover-trigger cue, this is just a plain toggle.
 */
export default function ThemeToggleButton() {
  const theme = useReaderStore((s) => s.theme);
  const setTheme = useReaderStore((s) => s.setTheme);
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <Tooltip label={label} side="bottom">
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label={label}
        className="cursor-pointer flex h-10 w-10 flex-none items-center justify-center rounded-sm border border-[var(--reader-border)] text-[var(--reader-text)] hover:bg-[var(--reader-surface-hover)]"
      >
        {isDark ? <Moon size={18} /> : <Sun size={18} />}
      </button>
    </Tooltip>
  );
}
