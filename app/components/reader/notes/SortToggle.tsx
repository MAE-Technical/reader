"use client";

import type { NoteSortMode } from "@/lib/reader/noteThread";

/** "Top" (rank by reaction count) vs "Chronological" (oldest
 * first, default) — a quiet underline toggle, not a prominent dropdown, so
 * it doesn't compete with the passage quote above it. */
export default function SortToggle({ mode, onChange }: { mode: NoteSortMode; onChange: (mode: NoteSortMode) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange("top")}
        className={`bg-transparent border-none border-b-2 pb-1 cursor-pointer text-[11px] font-semibold uppercase tracking-wide ${
          mode === "top" ? "border-brand-500 text-brand-500" : "border-transparent text-[var(--reader-text-muted)]"
        }`}
      >
        Top
      </button>
      <span className="text-[var(--reader-text-subtle)]">·</span>
      <button
        onClick={() => onChange("chronological")}
        className={`bg-transparent border-none border-b-2 pb-1 cursor-pointer text-[11px] font-semibold uppercase tracking-wide ${
          mode === "chronological" ? "border-brand-500 text-brand-500" : "border-transparent text-[var(--reader-text-muted)]"
        }`}
      >
        Chronological
      </button>
    </div>
  );
}
