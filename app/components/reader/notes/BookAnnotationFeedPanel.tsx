"use client";

import { useEffect, useRef } from "react";
import type { FeedEntry, FeedSectionGroup } from "@/lib/reader/annotationFeed";
import type { AnnotationFeedFilter } from "@/lib/reader/useBookAnnotationFeed";
import PillGroup from "../../PillGroup";
import PanelShell from "./PanelShell";
import FeedHighlightThread from "./FeedHighlightThread";

const FILTER_OPTIONS: { value: AnnotationFeedFilter; label: string }[] = [
  { value: "notes", label: "Notes" },
  { value: "highlights", label: "Highlights" },
  { value: "all", label: "All" },
];

/** A stable DOM id per section group, not a ref — looked up via
 * `document.getElementById` in an effect to position the panel on open,
 * same reasoning as the note panel's own composer-focus effects: this
 * project's stricter ref-access lint rule rejects a ref callback produced
 * inside a `.map()`, unlike a single non-looped element. */
function sectionGroupElementId(sectionId: string): string {
  return `feed-section-${sectionId}`;
}

/** The book-wide annotation feed — every section carrying a mark of any
 * kind, each entry showing its quote plus its full, real interactive
 * thread (see FeedHighlightThread) — a bare highlight renders as just the
 * quote and a collapsed "add a note" composer, same component either way.
 * Opening the panel scrolls once to wherever the reader currently is in
 * the book; browsing the feed itself never re-scrolls on its own. */
export default function BookAnnotationFeedPanel({
  bookId,
  groups,
  filter,
  onFilterChange,
  totalNoteCount,
  passageCount,
  activeSectionId,
  onJump,
  getPassageText,
  panelType,
  onClose,
}: {
  bookId: string;
  groups: FeedSectionGroup[];
  filter: AnnotationFeedFilter;
  onFilterChange: (filter: AnnotationFeedFilter) => void;
  totalNoteCount: number;
  passageCount: number;
  activeSectionId: string;
  onJump: (entry: FeedEntry) => void;
  getPassageText: (passageId: string) => string;
  panelType?: "side" | "sheet";
  onClose: () => void;
}) {
  // Fires once per "the panel just opened" — this component only mounts
  // while open (see Reader.tsx's `{noteFeed.open && <BookAnnotationFeedPanel/>}`),
  // so a plain mount-effect is exactly "once per open," no extra ref guard needed.
  const hasPositionedRef = useRef(false);
  useEffect(() => {
    if (hasPositionedRef.current) return;
    hasPositionedRef.current = true;
    requestAnimationFrame(() => {
      document.getElementById(sectionGroupElementId(activeSectionId))?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately once-on-mount, not on every activeSectionId change (see doc comment above).
  }, []);

  return (
    <PanelShell
      panelType={panelType}
      onClose={onClose}
      title={
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-serif font-semibold text-base text-[var(--reader-text)]">
            Notes & highlights
          </span>
          <span className="text-xs font-medium text-[var(--reader-text-muted)]">
            {totalNoteCount} {totalNoteCount === 1 ? "note" : "notes"}
            {passageCount > 0 && ` · ${passageCount} ${passageCount === 1 ? "highlight" : "highlights"}`}
          </span>
        </div>
      }
      subheader={
        <div className="px-5 pb-3">
          <PillGroup options={FILTER_OPTIONS} selected={filter} onSelect={onFilterChange} />
        </div>
      }
    >
      {groups.length === 0 ? (
        <p className="mt-4 py-1 font-serif text-sm text-[var(--reader-text-muted)]">
          {filter === "notes"
            ? "No notes in this book yet — add a note to a highlight and it shows up here."
            : filter === "highlights"
              ? "You have no private highlights in this book yet."
              : "No highlights in this book yet — select some text and mark it to start this book's feed."}
        </p>
      ) : (
        <div className="flex flex-col">
          {groups.map((group, i) => (
            <div key={group.sectionId} id={sectionGroupElementId(group.sectionId)} className={i === 0 ? undefined : "mt-6"}>
              {/* Sticky, feed-style group header (Contacts/Mail-style A-Z
                  dividers, Discourse's own date rail) rather than the old
                  symmetric hairline-flanked label, which read as a document
                  outline divider, not a feed. Pinned to the top of the
                  panel's own scroll container while its entries scroll past
                  underneath — the -mx-5/px-5 pair cancels that container's
                  own side padding so the sticky bar's background still
                  bleeds edge to edge instead of leaving the padding gutter
                  see-through. */}
              <div className="sticky top-0 z-10 -mx-5 flex items-center justify-between gap-3 border-b border-[var(--reader-border)] bg-[var(--reader-surface)] px-5 py-2.5">
                <span className="truncate text-[11px] font-bold uppercase tracking-wide text-[var(--reader-text-muted)]">
                  {group.label}
                </span>
                <span className="flex-none text-[11px] font-bold text-[var(--reader-text-subtle)]">
                  {group.entries.length}
                </span>
              </div>
              <div className="flex flex-col gap-5 pt-5">
                {group.entries.map((entry) => (
                  <FeedHighlightThread
                    key={entry.annotation.id}
                    bookId={bookId}
                    entry={entry}
                    getPassageText={getPassageText}
                    onJump={onJump}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
