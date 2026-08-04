"use client";

import { Moon, Sun } from "lucide-react";
import { useReaderStore } from "@/stores/reader-store";

/**
 * Plain sun/moon segmented control — simpler and more immediately legible
 * than a text-labeled toggle. Used by AccountView's Theme row (both auth
 * states) so the control can't drift between the two. The header's own
 * theme switch is ThemeToggleButton, a single icon button sized to match
 * NotificationsMenu's bell.
 */
export default function ThemeToggle() {
  const theme = useReaderStore((s) => s.theme);
  const setTheme = useReaderStore((s) => s.setTheme);

  const iconClass = (active: boolean) =>
    `flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${
      active
        ? "bg-[var(--reader-accent)]/15 text-[var(--reader-accent)]"
        : "text-[var(--reader-text-muted)] hover:bg-[var(--reader-surface-hover)]"
    }`;

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-label="Light theme"
        aria-pressed={theme === "light"}
        className={iconClass(theme === "light")}
      >
        <Sun size={16} />
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-label="Dark theme"
        aria-pressed={theme === "dark"}
        className={iconClass(theme === "dark")}
      >
        <Moon size={16} />
      </button>
    </div>
  );
}
