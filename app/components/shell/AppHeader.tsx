"use client";

import { Bell, Search } from "lucide-react";

type Props = {
  /** Omitted by pages with nothing to search yet (the stub pages) — the
   * input still renders, just uncontrolled and inert. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

export default function AppHeader({ searchValue, onSearchChange }: Props) {
  return (
    <div className="flex items-center gap-3 py-4 mb-5">
      <div className="flex-1 min-w-0 flex items-center gap-2 h-10 px-3.5 rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)]">
        <Search size={16} className="flex-none text-[var(--reader-text-muted)]" />
        <input
          value={searchValue ?? ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search books, authors, passages..."
          className="flex-1 min-w-0 border-none bg-transparent text-sm text-[var(--reader-text)] outline-none placeholder:text-[var(--reader-text-subtle)]"
        />
      </div>

      {/* No notification system exists yet — an affordance only, not wired
          to a dropdown/content since there's nothing to show. */}
      <button
        aria-label="Notifications"
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)] text-[var(--reader-text)] hover:bg-[var(--reader-surface-hover)]"
      >
        <Bell size={18} />
      </button>
    </div>
  );
}
