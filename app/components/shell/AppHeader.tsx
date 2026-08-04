"use client";

import { Search } from "lucide-react";
import NotificationsMenu from "./NotificationsMenu";
import ThemeToggleButton from "./ThemeToggleButton";

type Props = {
  /** Omitted by pages with nothing to search yet (the stub pages) — the
   * input still renders, just uncontrolled and inert. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

export default function AppHeader({ searchValue, onSearchChange }: Props) {
  return (
    <div className="flex items-center gap-2 py-4 mb-5">
      <div className="flex-1 min-w-0 flex items-center gap-2 h-10 px-3.5 rounded-sm border border-[var(--reader-border)] bg-[var(--reader-surface)]">
        <Search size={16} className="flex-none text-[var(--reader-text-muted)]" />
        <input
          value={searchValue ?? ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search books, authors, passages..."
          className="flex-1 min-w-0 border-none bg-transparent font-medium text-[14px] text-[var(--reader-text)] outline-none placeholder:text-[var(--reader-text-subtle)]"
        />
      </div>

      <ThemeToggleButton />
      <NotificationsMenu />
    </div>
  );
}
