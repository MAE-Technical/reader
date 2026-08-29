"use client";

export type TabOption<T extends string> = { value: T; label: string };

/**
 * The underline-tab look for a page/panel-level "which whole view" switch —
 * a plain text label with only the active tab's own bottom border colored
 * in, `-mb-px` so that 2px border sits on the same baseline as whichever
 * shared 1px divider the caller draws under the whole row, rather than this
 * component drawing that baseline itself (BookDetailView wraps this in its
 * own `border-b` container; the reader's note panel relies on PanelShell's
 * own subheader divider instead) — same trick, two different callers
 * supplying the shared line for their own layout reasons.
 *
 * Distinct from PillGroup (this app's other shared filter control, bordered/
 * filled pills) — reserved for a top-level "which whole view" switch (book
 * details' Table of contents/Community notes, the reader's own Public
 * notes/Your highlights), not for narrowing one list among several peer
 * filters (category pills, feed sort), which stays PillGroup's job.
 */
export default function UnderlineTabs<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: TabOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="flex gap-6">
      {options.map((opt) => {
        const active = opt.value === selected;
        return (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`-mb-px cursor-pointer border-b-2 bg-transparent px-0.5 pb-3 text-[12px] font-semibold transition-colors ${
              active
                ? "border-[var(--reader-text)] text-[var(--reader-text)]"
                : "border-transparent text-[var(--reader-text-subtle)] hover:text-[var(--reader-text-muted)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
