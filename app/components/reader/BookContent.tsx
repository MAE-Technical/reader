"use client";

import { memo } from "react";
import { ImagePassageBlock, PassageText, type NoteLookup } from "../PassageContent";
import type { BookDocument, Passage, Section } from "@/lib/book/schema";
import type { Annotation } from "@/stores/library-store";

// How much larger than body text each heading level renders — h1 down to
// h6/unleveled, so a chapter's own subheadings stay visually distinct from
// its title instead of one uniform "heading" size for every <h1>-<h6>.
const HEADING_FONT_BUMP: Record<number, number> = { 1: 16, 2: 10, 3: 6, 4: 4, 5: 2, 6: 1 };
function headingFontBump(level: number | undefined): number {
  return level !== undefined ? HEADING_FONT_BUMP[level] ?? 1 : 8;
}

type BookContentProps = {
  book: BookDocument;
  activeIndex: number;
  registerSlide: (id: string) => (el: HTMLDivElement | null) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onAnyClick: () => void;
  contentPad: string;
  contentWidth: number;
  contentTopPad: number;
  contentBottomPad: number;
  orderedSections: Section[];
  notesIndexSectionId: string | null;
  notesIndexGroups: { heading: Passage; notes: BookDocument["notes"] }[] | null;
  getAnnotations: (passageId: string) => Annotation[];
  fontSize: number;
  lineHeight: number;
  fontFamilyVar: string;
  notesById: Map<string, NoteLookup>;
  onNoteClick: (note: NoteLookup, target: HTMLElement) => void;
  /** Fires on the *section's* own mouseup (not per-passage) so a drag that
   * crosses paragraph boundaries is captured as one selection. */
  onTextSelect: (sectionEl: HTMLElement) => void;
  /** A plain click on any existing mark — highlight-only or noted alike —
   * opening its thread directly. */
  onNoteMarkerClick: (passageId: string, annotationId: string) => void;
};

/**
 * The book itself — only the *active* section is ever mounted (not a
 * horizontal carousel of every section side by side): swipe/arrow/edge-
 * click/keyboard all resolve to a plain activeIndex change, and moving to a
 * new section is a full remount (`key={section.id}` below) with a quick
 * `reader-fade-in` animation, not a translated/sliding DOM. Two earlier
 * attempts at a real sliding transition (hand-rolled `translateX`, then
 * Embla Carousel) both ran into rendering bugs from the same root cause: a
 * horizontal carousel whose slides are also independently tall,
 * vertically-scrolling regions isn't a shape either approach handles well.
 * Mounting one section at a time sidesteps that entirely, and is simpler
 * besides — no `content-visibility` virtualization needed either, since
 * there's nothing else mounted to virtualize.
 */
const BookContent = memo(function BookContent({
  book,
  activeIndex,
  registerSlide,
  onPointerDown,
  onPointerUp,
  onAnyClick,
  contentPad,
  contentWidth,
  contentTopPad,
  contentBottomPad,
  orderedSections,
  notesIndexSectionId,
  notesIndexGroups,
  getAnnotations,
  fontSize,
  lineHeight,
  fontFamilyVar,
  notesById,
  onNoteClick,
  onTextSelect,
  onNoteMarkerClick,
}: BookContentProps) {
  const firstSectionId = orderedSections[0]?.id;
  const section = orderedSections[activeIndex];

  if (!section) {
    return <div className="flex-1 min-h-0 relative overflow-hidden" />;
  }

  const isPartDivider = section.children.length > 0;
  const isNotesIndex = section.id === notesIndexSectionId && notesIndexGroups;

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      className="flex-1 min-h-0 relative overflow-hidden"
    >
      <div
        key={section.id}
        ref={registerSlide(section.id)}
        data-section-id={section.id}
        onClick={onAnyClick}
        onMouseUp={(e) => onTextSelect(e.currentTarget)}
        // Mirrors onMouseUp exactly (same handler, same call shape) — a
        // touch-based long-press-to-select on Safari/iPhone ends in a
        // `touchend` rather than a `mouseup`, so without this the pill
        // never appeared there. Deliberately just this, not a
        // `selectionchange` listener: that fires continuously throughout
        // an in-progress drag (mouse or touch) and showed intermediate,
        // not-yet-final selection states — flickering the pill and
        // occasionally rendering a stale multi-passage range. touchend
        // only fires once, right when the gesture actually ends.
        onTouchEnd={(e) => onTextSelect(e.currentTarget)}
        // select-none here, select-text on each passage <p> below — user-
        // select doesn't strictly inherit, so a child can still opt back
        // into being selectable. Giving Safari this explicit boundary (this
        // scrolling container is NOT selectable, only the actual passage
        // text is) is the other half of the .no-callout fix in globals.css:
        // without it, a long-press here had nothing telling it where
        // "selectable" stops, and it would balloon past the tapped word to
        // the whole visible screen.
        className="reader-fade-in om-scroll h-full overflow-y-auto relative select-none"
        style={{ background: "var(--reader-bg)" }}
      >
        <div
          className={`mx-auto box-border ${contentPad}`}
          style={{ maxWidth: contentWidth, paddingTop: contentTopPad, paddingBottom: contentBottomPad }}
        >
          {section.id === firstSectionId && (
            // Inline byline — book title/author live in the scrolling
            // content itself (Matter-style: the header stays minimal),
            // shown once at the very start of the book.
            <div className="mb-10">
              <div className="text-[11px] font-semibold tracking-wide uppercase text-[var(--reader-text-muted)]">
                {book.metadata.author}
              </div>
              <div className="text-2xl font-semibold font-serif text-[var(--reader-text)] mt-1">
                {book.metadata.title}
              </div>
            </div>
          )}

          {isNotesIndex
            ? notesIndexGroups!.map(({ heading, notes }) => (
                <div key={heading.id} data-passage-id={heading.id} className="mb-8">
                  <h3
                    className="font-serif font-semibold text-lg m-0 mb-3"
                    style={{ color: "var(--reader-text)" }}
                  >
                    {heading.text}
                  </h3>
                  {notes.length === 0 ? (
                    <p className="text-sm text-[var(--reader-text-muted)] m-0">
                      No notes for this chapter.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {notes.map((n) => (
                        <p
                          key={n.id}
                          className="m-0 font-serif text-sm leading-relaxed"
                          style={{ color: "var(--reader-text)" }}
                        >
                          {n.text}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))
            : section.passages.map((raw) => {
                const annotations = getAnnotations(raw.id);
                const isHeading = raw.type === "heading";
                const headingBump = isPartDivider ? 14 : headingFontBump(raw.level);

                const passageText = (
                  <p
                    // select-text: pins this paragraph as its own explicit
                    // selection root (see the .no-callout comment in
                    // globals.css) — the standard WebKit fix for long-press
                    // selection ballooning past the tapped word.
                    className="m-0 font-serif rounded-xs select-text"
                    style={{
                      ...(isHeading
                        ? {
                            fontFamily: fontFamilyVar,
                            fontWeight: 700,
                            fontSize: fontSize + headingBump,
                            lineHeight: 1.3,
                            textAlign: isPartDivider ? "center" : "left",
                            textTransform: isPartDivider ? "uppercase" : "none",
                            letterSpacing: isPartDivider ? "0.08em" : "normal",
                            color: "var(--reader-text)",
                          }
                        : {
                            // Separate longhand properties, not the `font`
                            // shorthand — WebKit/Safari drops the entire
                            // shorthand declaration when its font-family slot
                            // is a CSS custom property (var(--font-...)),
                            // silently falling back to the browser default
                            // font/size/line-height. That's what made body
                            // text render at the wrong size with the wrong
                            // spacing specifically on Safari/iPhone, even
                            // though headings (already longhand below) were
                            // unaffected.
                            fontFamily: fontFamilyVar,
                            fontWeight: 400,
                            fontSize,
                            lineHeight,
                            color: "var(--reader-text)",
                          }),
                    }}
                  >
                    <PassageText
                      passage={raw}
                      notesById={notesById}
                      onNoteClick={onNoteClick}
                      annotations={annotations}
                      onNoteMarkerClick={(annotationId) => onNoteMarkerClick(raw.id, annotationId)}
                      // Word-level karaoke highlighting is disabled for now:
                      // audio is generated as one Kokoro call per passage,
                      // concatenated into a section-length mp3 (lib/audio/
                      // mp3.ts) with each chunk's own reported duration used
                      // to offset the next — real decoded playback drifts
                      // from that cumulative estimate (mp3 encoder padding/
                      // delay per chunk), so a highlighted word gets
                      // increasingly out of step with what's actually
                      // playing the further into a section you are. Passing
                      // currentWordIndex through here again is the whole
                      // fix once audio generation moves to one gapless
                      // synthesis per section (or timestamps are corrected
                      // against real decoded chunk durations).
                      activeWordIndex={undefined}
                    />
                  </p>
                );

                return (
                  <div
                    key={raw.id}
                    data-passage-id={raw.id}
                    data-passage-type={raw.type}
                    style={{
                      marginTop: isHeading ? (isPartDivider ? 56 : 32) : 0,
                      marginBottom: `${((24 * lineHeight) / 1.7).toFixed(0)}px`,
                    }}
                  >
                    {raw.type === "image" ? <ImagePassageBlock passage={raw} /> : passageText}
                  </div>
                );
              })}
        </div>
      </div>

      {/* Hints that there's more below before hitting the docked
          ChapterNavFooter (Reader.tsx) — purely visual, pointer-events-none
          so it never intercepts scroll/selection. */}
      {/* <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
        style={{ background: "linear-gradient(to bottom, transparent, var(--reader-bg))" }}
      /> */}
    </div>
  );
});

export default BookContent;
