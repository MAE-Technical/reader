"use client";

import { ChevronDown } from "lucide-react";
import type { Section } from "@/lib/book/schema";
import { sectionLabel } from "@/lib/reader/sectionHeading";

type Props = {
  section: Section | undefined;
  onClick: () => void;
};

/**
 * Current-chapter indicator + outline trigger, rendered inline as part of
 * ReaderHeader's own row (not a persistent overlay — reader feedback was
 * that a fixed element visible on every scroll-up/tap broke the
 * distraction-free reading experience; it now shows and hides exactly on
 * ReaderHeader's own lifecycle, same as everything else in that bar).
 * Replaces both the old outline icon (redundant once this exists — tapping
 * it is the only way to open the outline, on both breakpoints) and the
 * header's book title/author block (that identity lives one tap away, in
 * the outline's own header).
 *
 * Styled like plain chrome, not a bordered chip — a trailing chevron is
 * what signals "this opens something" instead, matching how the rest of
 * the header's icon buttons only pick up a background on hover/press.
 */
export default function ChapterPill({ section, onClick }: Props) {
  const label = section ? sectionLabel(section) : null;
  if (!label) return null;

  return (
    <button
      onClick={onClick}
      title="Chapters"
      // No flex-1 here — ReaderHeader's own wrapping group around this
      // already carries flex-1 to push the icon cluster right, so this
      // button sizing to its own content (capped by max-w-* below, for
      // long titles) is what keeps the hover background to just the text
      // + chevron instead of ballooning across the header's whole
      // remaining width.
      className="min-w-0 sm:max-w-60 md:max-w-80 flex items-center gap-1 rounded-sm px-2 py-1.5 -ml-1 cursor-pointer text-left transition-colors hover:bg-[var(--reader-surface-hover)]"
    >
      <span className="truncate text-[13px] font-semibold text-[var(--reader-text)]">{label}</span>
      <ChevronDown size={14} className="flex-none text-[var(--reader-text-muted)]" />
    </button>
  );
}
