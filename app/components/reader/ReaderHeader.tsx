"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, Moon, Play, Search, Sun } from "lucide-react";
import Tooltip from "./Tooltip";
import type { Theme } from "@/stores/reader-store";

type Props = {
  visible: boolean;
  topBarHeightPx: number;
  railInsetPx: number;
  bookTitle: string;
  bookAuthor: string;
  chaptersOpen: boolean;
  onToggleChapters: () => void;
  /** No listen button at all when the book has no narrator — not even a
   * disabled one, per product decision: there's nothing for it to do. */
  hasNarration: boolean;
  /** While true, the button below is hidden entirely rather than turned
   * into a play/pause toggle — the persistent player (NowPlayingBar) is
   * the only place play/pause lives once listening has started, so
   * there's exactly one control per action and no way for the two to
   * drift out of sync. This button's only job is *starting* listen mode;
   * closing the player (its own X) is what brings it back. */
  isListen: boolean;
  onListen: () => void;
  onToggleSearch: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  /** Reading progress (0-1) — rendered inline next to the author rather
   * than as its own row, so the header stays a single compact line. */
  scrollPct: number;
};

const iconButtonClass =
  "w-9 h-9 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center flex-none text-[var(--reader-text)] transition-colors hover:bg-[var(--reader-surface-hover)]";

/**
 * Header — back arrow and outline/chapters toggle on the left, beside a
 * book-title / author block; listen, search, and theme clustered on the
 * right. A solid, theme-appropriate surface with a hairline bottom border
 * (replacing the old transparent floating bar). Shows on mouse-move/click,
 * hides on a second click or on scroll — same lifecycle as before.
 */
export default function ReaderHeader({
  visible,
  topBarHeightPx,
  railInsetPx,
  bookTitle,
  bookAuthor,
  chaptersOpen,
  onToggleChapters,
  hasNarration,
  isListen,
  onListen,
  onToggleSearch,
  theme,
  onToggleTheme,
  scrollPct,
}: Props) {
  const pct = Math.round(scrollPct * 100);

  return (
    <div
      style={{ height: topBarHeightPx, paddingLeft: railInsetPx, paddingRight: railInsetPx }}
      className={`absolute top-0 left-0 right-0 z-20 flex items-center gap-2 box-border border-b border-[var(--reader-border)] bg-[var(--reader-surface)] transition-[transform,opacity] duration-200 ease-out ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <Tooltip label="Back to library" side="bottom" align="start">
        <Link
          href="/"
          aria-label="Back to library"
          className="w-9 h-9 rounded-md border border-[var(--reader-border)] bg-[var(--reader-surface)] flex items-center justify-center text-[var(--reader-text)] no-underline flex-none"
        >
          <ArrowLeft size={18} />
        </Link>
      </Tooltip>

      <button
        onClick={onToggleChapters}
        title="Chapters"
        className="min-w-0 flex-1 flex items-center gap-2 border-none bg-transparent cursor-pointer text-left"
      >
        <span
          className={`w-9 h-9 rounded-md flex items-center justify-center flex-none ${
            chaptersOpen ? "bg-brand-500/10 text-brand-500" : "text-[var(--reader-text)]"
          }`}
        >
          <BookOpen size={18} />
        </span>

        <div className="min-w-0 sm:max-w-20 md:max-w-120 flex flex-col justify-center leading-tight">
          <div className="text-sm font-semibold text-[var(--reader-text)] truncate">{bookTitle}</div>
          <div className="flex items-center gap-1.5 min-w-0">
            {bookAuthor && (
              <span className="text-xs text-[var(--reader-text-muted)] truncate">{bookAuthor}</span>
            )}
            <span className="text-[var(--reader-text-subtle)] flex-none">·</span>
            <div className="w-8 h-[3px] rounded-full bg-[var(--reader-surface-hover)] overflow-hidden flex-none">
              <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] font-medium text-[var(--reader-text-muted)] flex-none whitespace-nowrap">
              {pct}%
            </span>
          </div>
        </div>
      </button>

      {hasNarration && !isListen && (
        <Tooltip label="Listen to this book" side="bottom">
          <button onClick={onListen} aria-label="Listen to this book" className={iconButtonClass}>
            <Play size={18} />
          </button>
        </Tooltip>
      )}

      <Tooltip label="Search" side="bottom" align="end">
        <button onClick={onToggleSearch} aria-label="Search" className={iconButtonClass}>
          <Search size={18} />
        </button>
      </Tooltip>

      <Tooltip label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"} side="bottom" align="end">
        <button
          onClick={onToggleTheme}
          aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
          className={iconButtonClass}
        >
          {theme === "light" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </Tooltip>
    </div>
  );
}
