"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Section } from "@/lib/book/schema";
import { sectionLabel } from "@/lib/reader/sectionHeading";

type Props = {
  prevSection: Section | undefined;
  nextSection: Section | undefined;
  onPrev: () => void;
  onNext: () => void;
  /** Only surfaces once the reader has actually reached the bottom of the
   * current section — unobtrusive the rest of the time, the same
   * "chrome only when the reader signals for it" idea as the header. A
   * floating overlay (not a flex sibling), so hiding it doesn't reflow the
   * reading column underneath — mirrors how the header floats above content
   * rather than pushing it down. */
  visible: boolean;
  /** Pushed up above the fixed "now playing" bar when one is active. */
  bottomOffsetPx: number;
};

/**
 * Always-visible-when-relevant chapter navigation — replaces the old
 * invisible full-height edge-hover buttons (removed entirely; swipe on
 * mobile and this footer/keyboard on desktop are now the only page-turn
 * affordances). Real chapter titles, generous tap targets (min-h-16, well
 * over the ~44px minimum), and a clear label/title split for legibility on
 * mobile.
 */
export default function ChapterNavFooter({
  prevSection,
  nextSection,
  onPrev,
  onNext,
  visible,
  bottomOffsetPx,
}: Props) {
  if (!prevSection && !nextSection) return null;

  return (
    <div
      style={{ bottom: bottomOffsetPx }}
      className={`absolute left-0 right-0 z-10 flex border-t border-[var(--reader-border)] bg-[var(--reader-surface)] transition-[transform,opacity] duration-200 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      {prevSection ? (
        <button
          onClick={onPrev}
          className="group min-h-16 flex-1 min-w-0 flex items-center gap-2.5 border-none border-r border-r-[var(--reader-border)] bg-transparent cursor-pointer text-left px-4 py-3"
        >
          <ChevronLeft
            size={18}
            className="flex-none text-[var(--reader-text-muted)] transition-colors group-hover:text-[var(--reader-text)]"
          />
          <div className="min-w-0">
            <div className="text-[10.5px] font-semibold tracking-wide uppercase text-[var(--reader-text-muted)]">
              Previous
            </div>
            <div className="truncate text-[13px] font-semibold text-[var(--reader-text)] mt-0.5">
              {sectionLabel(prevSection) ?? "Previous"}
            </div>
          </div>
        </button>
      ) : (
        <div className="flex-1 border-r border-[var(--reader-border)]" />
      )}

      {nextSection ? (
        <button
          onClick={onNext}
          className="group min-h-16 flex-1 min-w-0 flex items-center justify-end gap-2.5 border-none bg-transparent cursor-pointer text-right px-4 py-3"
        >
          <div className="min-w-0">
            <div className="text-[10.5px] font-semibold tracking-wide uppercase text-[var(--reader-text-muted)]">
              Next
            </div>
            <div className="truncate text-[13px] font-semibold text-[var(--reader-text)] mt-0.5">
              {sectionLabel(nextSection) ?? "Next"}
            </div>
          </div>
          <ChevronRight
            size={18}
            className="flex-none text-[var(--reader-text-muted)] transition-colors group-hover:text-[var(--reader-text)]"
          />
        </button>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}
