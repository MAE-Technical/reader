"use client";

import type { ReactNode } from "react";

export type OverflowMenuItem = {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
};

const DANGER_COLOR = "#f26b6b";

/** Generic scrim + floating menu-item list — the shared positioning
 * primitive behind both a per-entry Edit/Delete/Share menu and the panel
 * header's own Share/Delete menu, so the "fixed inset-0 catches the
 * outside click that closes it" mechanics only live in one place. */
export default function OverflowMenu({ items, onClose }: { items: OverflowMenuItem[]; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-19" />
      <div className="absolute right-0 top-[calc(100%+4px)] min-w-38 py-1 rounded-md bg-[var(--reader-surface)] border border-[var(--reader-border)] shadow-lg z-20">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.disabled ? undefined : item.onClick}
            disabled={item.disabled}
            style={item.danger && !item.disabled ? { color: DANGER_COLOR } : undefined}
            className={`w-full flex items-center gap-2 bg-transparent border-none py-1.5 px-3 text-xs font-medium text-left ${
              item.disabled ? "cursor-not-allowed text-[var(--reader-text-subtle)]" : "cursor-pointer text-[var(--reader-text)]"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
