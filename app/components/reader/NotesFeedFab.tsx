"use client";

import { MessageCircle } from "lucide-react";

type Props = {
  count: number;
  onClick: () => void;
  /** Same lifecycle as ChapterNavFooter (footerVisible && !selection) — a
   * persistent, always-on FAB turned out to undercut the distraction-free
   * reading experience per reader feedback, so this now shows/hides on
   * scroll-up/tap/reaching-the-bottom exactly like the rest of the bottom
   * chrome instead of staying on screen through it. */
  visible: boolean;
  /** Stacks above whichever bottom-docked bars are currently showing (the
   * "now playing" bar, ChapterNavFooter) — same bottomOffsetPx convention
   * every other floating reader control already follows. */
  bottomOffsetPx: number;
};

/**
 * Floating trigger for the book-wide notes/highlights feed — moved out of
 * the header (previously a header icon button) to cut header clutter.
 * No border (a lone ring here read as clutter of its own against the
 * badge) — just a soft shadow to lift it off the page, same "subtle, not a
 * call to action" intent as before.
 */
export default function NotesFeedFab({ count, onClick, visible, bottomOffsetPx }: Props) {
  return (
    <div
      style={{ bottom: bottomOffsetPx + 16, right: 16 }}
      className={`fixed z-40 transition-[transform,opacity] duration-200 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 pointer-events-none"
      }`}
    >
        <button
          onClick={onClick}
          aria-label="All notes in this book"
          className="relative w-11 h-11 rounded-full bg-[var(--reader-surface)] text-[var(--reader-text-muted)] flex items-center justify-center cursor-pointer shadow-sm transition-colors hover:text-[var(--reader-text)]"
        >
          <MessageCircle size={18} />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[var(--reader-surface)]">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
    </div>
  );
}
