"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Highlighter, MessageCircle, Trash2 } from "lucide-react";
import NotesSidebar from "./NotesSidebar";
import SearchModal from "./SearchModal";
import FootnotePopover from "./FootnotePopover";
import type { NoteLookup } from "./PassageContent";
import BookContent from "./reader/BookContent";
import ReaderHeader from "./reader/ReaderHeader";
import ChaptersDrawer from "./reader/ChaptersDrawer";
import ChapterNavFooter from "./reader/ChapterNavFooter";
import SelectionMenu, { type Item } from "./reader/SelectionMenu";
import BackToCurrentButton from "./reader/BackToCurrentButton";
import Loader from "./Loader";
import type { BookDocument, Passage, Section } from "@/lib/book/schema";
import {
  FONT_FAMILY_VARS,
  contentWidthPxFromScale,
  fontSizePxFromScale,
  lineHeightFromScale,
  useReaderStore,
} from "@/stores/reader-store";
import { useLibraryStore } from "@/stores/library-store";
import { useAudioStore } from "@/stores/audio-store";
import { useNarrationStore } from "@/stores/narration-store";
import { useReaderIdentityStore } from "@/stores/reader-identity-store";
import { buildSectionsById } from "@/lib/reader/sections";
import { useSectionCarousel } from "@/lib/reader/useSectionCarousel";
import { useResumeScroll } from "@/lib/reader/useResumeScroll";
import { useReadingProgress } from "@/lib/reader/useReadingProgress";
import { useTextAnnotations } from "@/lib/reader/useTextAnnotations";
import { sectionLabel } from "@/lib/reader/sectionHeading";

export default function Reader({ book }: { book: BookDocument }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState<{ note: NoteLookup; top: number; left: number } | null>(
    null
  );

  const {
    getForPassage: getAnnotations,
    selection,
    notesPanel,
    onTextSelect,
    dismissSelection,
    highlightSelection,
    noteFromSelection,
    hasExistingAnnotation,
    deleteSelection,
    onNoteMarkerClick,
    closeNotesPanel,
  } = useTextAnnotations(book.id);

  const theme = useReaderStore((s) => s.theme);
  const setTheme = useReaderStore((s) => s.setTheme);
  const fontSizeScale = useReaderStore((s) => s.fontSizeScale);
  const fontFamily = useReaderStore((s) => s.fontFamily);
  const lineSpacingScale = useReaderStore((s) => s.lineSpacingScale);
  const contentWidthScale = useReaderStore((s) => s.contentWidthScale);

  // "Now playing" is a single global slot (audio-store), not a per-book
  // flag — this book is in listen mode exactly when it's the one loaded
  // there. That's what makes the player survive navigation to another
  // page (reader-issues: permanence): closing it is the only thing that
  // clears the slot, never just navigating away from this book's page.
  const audioStoreBook = useAudioStore((s) => s.book);
  const openBook = useAudioStore((s) => s.openBook);
  const playerHeight = useAudioStore((s) => s.playerHeight);
  const anyPlayerActive = audioStoreBook !== null;
  const hasNarration = book.narrators.length > 0;
  const isListen = audioStoreBook?.id === book.id;

  const narrationAudioIndex = useNarrationStore((s) => s.audioIndex);
  const narrationAudioSection = useNarrationStore((s) => s.audioSection);
  const currentPlayingPassageId = useNarrationStore((s) => s.currentPlayingPassageId);

  // These stores skip automatic persist hydration (see their own comments)
  // specifically so the server and the client's first paint render
  // identical output — pulling in the real localStorage values here, once,
  // right after mount, is what actually restores them. reader-identity-
  // store's rehydrate must land before ensureReaderId, so a returning
  // reader's existing id is reused rather than shadowed by a fresh one.
  // `hydrated` gates the loading overlay below — without it, the reader
  // would paint once with default theme/font/position and then visibly
  // snap to the real persisted values a moment later.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    Promise.all([
      useReaderStore.persist.rehydrate(),
      useLibraryStore.persist.rehydrate(),
      useReaderIdentityStore.persist.rehydrate(),
    ])
      .catch(() => {}) // a storage read failure shouldn't hang the reader
      .then(() => {
        useReaderIdentityStore.getState().ensureReaderId();
        setHydrated(true);
      });
  }, []);

  const fontSize = fontSizePxFromScale(fontSizeScale);
  const lineHeight = lineHeightFromScale(lineSpacingScale);
  const contentWidth = contentWidthPxFromScale(contentWidthScale);
  const fontFamilyVar = FONT_FAMILY_VARS[fontFamily];

  const sectionsById = useMemo(() => buildSectionsById(book.sections), [book.sections]);

  // book.spine is already the whole book's reading order (front matter,
  // part dividers, and chapters alike) — the same order the sidebar and
  // audio auto-advance walk. Each spine entry is now one carousel "slide"
  // (reader-issues #2: section-per-page, not one continuous document).
  const orderedSections = useMemo(
    () => book.spine.map((id) => sectionsById.get(id)).filter((s): s is Section => Boolean(s)),
    [book.spine, sectionsById]
  );
  const sectionIds = useMemo(() => orderedSections.map((s) => s.id), [orderedSections]);

  const passageLookup = useMemo(() => {
    const byId = new Map<string, Passage>();
    const sectionOf = new Map<string, string>();
    for (const section of orderedSections) {
      for (const p of section.passages) {
        byId.set(p.id, p);
        sectionOf.set(p.id, section.id);
      }
    }
    return { byId, sectionOf };
  }, [orderedSections]);

  // Endnote/bibliography sections (e.g. "Notes") ingest one of two shapes —
  // bare chapter-divider headings (one per citing chapter, note bodies
  // diverted under each into book.notes) or entirely empty (the whole file
  // was note-body markup with no interstitial headers at all; ingestion
  // still gives it a spine slot since it's a titled, TOC-listed chapter —
  // see pipeline.py's all_leaves comment) — but either way the section's
  // *own* passages are never a reliable index into book.notes: a chapter-
  // divider list often opens with a page-title heading ("Notes") that isn't
  // itself a chapter, which shifts a positional pairing against book.notes
  // out of alignment for every entry after it. Group by each note's own
  // sectionId instead (always correct) and label groups from the *citing*
  // chapter's own title/heading — never from text found inside the notes
  // section itself.
  //
  // Candidate detection also has to reject a false-positive shape: a plain
  // two-line Part-divider page ("PART ONE" / "The Bolshevik") satisfies the
  // same "every passage is a heading" test as a real endnotes chapter. Where
  // one exists, prefer a candidate whose own title says "notes" before
  // falling back to the bare structural match.
  const notesIndexSectionId = useMemo(() => {
    if (!book.notes.length) return null;
    const isNotesShaped = (s: Section) =>
      s.passages.length === 0 ||
      (s.passages.length > 1 && s.passages.every((p) => p.type === "heading"));
    const titled = orderedSections.find((s) => isNotesShaped(s) && /note/i.test(s.title ?? ""));
    return titled?.id ?? orderedSections.find(isNotesShaped)?.id ?? null;
  }, [orderedSections, book.notes.length]);

  const notesIndexGroups = useMemo(() => {
    if (!notesIndexSectionId) return null;
    const orderedNoteSectionIds = Array.from(new Set(book.notes.map((n) => n.sectionId))).sort(
      (a, b) => book.spine.indexOf(a) - book.spine.indexOf(b)
    );
    return orderedNoteSectionIds.map((sectionId, i) => {
      const citingSection = sectionsById.get(sectionId);
      const label = (citingSection && sectionLabel(citingSection)) || "Notes";
      return {
        heading: { id: `${notesIndexSectionId}-h${i}`, index: i, type: "heading" as const, text: label },
        notes: book.notes.filter((n) => n.sectionId === sectionId),
      };
    });
  }, [notesIndexSectionId, sectionsById, book.notes, book.spine]);

  const notesById = useMemo(() => new Map(book.notes.map((n) => [n.id, n])), [book.notes]);

  // Any open modal/panel (or an active selection menu) suspends the
  // carousel's own keyboard/swipe handling, so typing in search or
  // arrow-keying through a picker never turns the page underneath. The
  // chapters drawer and the notes panel are both deliberately excluded —
  // neither is a blocking overlay (no scrim, see the notes-panel render
  // below), so the reader stays fully navigable (scroll/swipe/keyboard)
  // with either left open, same as the chapters drawer already was.
  const navDisabled = searchOpen || Boolean(noteOpen) || Boolean(selection);

  const {
    activeIndex,
    activeSectionId,
    goTo,
    goToSection,
    next,
    prev,
    registerSlide,
    getSlideEl,
    isMobile,
    chromeHidden,
    setChromeHidden,
    scrollPct,
    atBottom,
    onPointerDown,
    onPointerUp,
  } = useSectionCarousel({
    sectionIds,
    // The selection menu floats at a fixed viewport position tied to a text
    // range at the moment it opened — once the page scrolls, that position
    // no longer points at the selection, so treat any scroll as a dismissal
    // rather than leaving a stale menu floating in place. A page turn can
    // move the reader to a new slide with zero scroll events, so it gets
    // its own dismissal trigger (onNavigate) rather than relying on scroll.
    onScroll: dismissSelection,
    onNavigate: dismissSelection,
    disabled: navDisabled,
  });

  const resumeReady = useResumeScroll({
    book,
    sectionsById,
    orderedSections,
    goTo,
    getSlideEl,
  });

  // Gates the full-screen loader below — the reader isn't considered ready
  // until every piece of state it renders from (theme/font/position, via
  // `hydrated`; scroll position, via `resumeReady`) reflects the reader's
  // actual saved data rather than a first-paint default.
  const isReady = hydrated && resumeReady;

  // Plain reading (no audio) had no position-save path at all — only
  // listen-mode's own effects (now in NarrationEngine) ever called
  // setPosition, so leaving a book mid-chapter while just reading never
  // persisted anything finer than "which section," and resuming always
  // dropped the reader back at the chapter's first passage. This tracks
  // scroll position within the active section instead (skipping entirely
  // while isListen, which keeps owning its own audio-offset-aware writes).
  useReadingProgress({
    book,
    mode: isListen ? "listen" : "read",
    activeSectionId,
    activeSection: sectionsById.get(activeSectionId),
    getSlideEl,
  });

  // Podcast-style auto-advance (spec.md): the narration engine (global,
  // book-agnostic) owns the actual position/audio-clock advance — this
  // only decides whether *this page's* carousel should also turn, which is
  // a page-local concern the engine can't know about. Comparing against
  // the *previous* audioIndex (not the current one) is what distinguishes
  // "the reader was following along when it advanced" from "the reader had
  // already turned away" — isFollowingNarration below is a plain snapshot
  // of the current relationship, but by the time audioIndex has already
  // moved, comparing against it directly would always read "away".
  const prevAudioIndexRef = useRef(narrationAudioIndex);
  useEffect(() => {
    if (
      isListen &&
      narrationAudioIndex !== prevAudioIndexRef.current &&
      activeIndex === prevAudioIndexRef.current
    ) {
      goTo(narrationAudioIndex, { animate: true });
    }
    prevAudioIndexRef.current = narrationAudioIndex;
  }, [narrationAudioIndex, isListen, activeIndex, goTo]);

  // Which spine position audio is on, vs which slide the reader is
  // actually looking at (activeIndex, from the carousel) — deliberately
  // independent (manual navigation never forces one to match the other),
  // but when they DO match, that's "the reader is following narration".
  const isFollowingNarration = isListen && activeIndex === narrationAudioIndex;

  // Keeps the currently-narrated passage in view as playback advances —
  // only while the reader is actually following along. If they've
  // manually turned elsewhere, narration must never reach into an
  // off-screen slide and change its scroll position out from under them.
  useEffect(() => {
    if (!isFollowingNarration || !currentPlayingPassageId || !narrationAudioSection) return;
    const el = getSlideEl(narrationAudioSection.id)?.querySelector(
      `[data-passage-id="${currentPlayingPassageId}"]`
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentPlayingPassageId, isFollowingNarration, narrationAudioSection, getSlideEl]);

  // "Back to narration" — the nudge that appears once the reader has
  // manually turned away from whichever section is actually playing. Only
  // makes sense while listening: audio playing somewhere is a plain fact
  // to navigate back to, unlike plain reading (no playback, just a
  // resume-position guess) where the same nudge would read as the app
  // second-guessing a reader who may have turned away on purpose.
  const awayFromNarration = isListen && !isFollowingNarration;
  const nudgeDirection: "up" | "down" = narrationAudioIndex < activeIndex ? "up" : "down";
  const jumpToNarration = useCallback(() => {
    goTo(narrationAudioIndex, { animate: false });
    if (!currentPlayingPassageId || !narrationAudioSection) return;
    requestAnimationFrame(() => {
      getSlideEl(narrationAudioSection.id)
        ?.querySelector(`[data-passage-id="${currentPlayingPassageId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [goTo, narrationAudioIndex, currentPlayingPassageId, narrationAudioSection, getSlideEl]);

  const activeSectionForSidebar = activeSectionId ?? book.spine[0];
  const currentSection = orderedSections[activeIndex];
  const currentSectionLabel = currentSection ? sectionLabel(currentSection) : null;
  const prevSection = orderedSections[activeIndex - 1];
  const nextSection = orderedSections[activeIndex + 1];
  const getPassageText = useCallback(
    (passageId: string) => passageLookup.byId.get(passageId)?.text ?? "",
    [passageLookup]
  );

  const onNoteClick = useCallback((note: NoteLookup, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    setNoteOpen({
      note,
      top: rect.bottom + 6,
      left: Math.min(window.innerWidth - 336, Math.max(8, rect.left - 140)),
    });
  }, []);

  const menuCopy = () => {
    setCopyLabel("Copied ✓");
    setTimeout(() => {
      setCopyLabel("Copy");
      dismissSelection();
    }, 800);
  };

  // The outline (and, same reasoning, the notes panel) forces the header
  // away for as long as either is open (rather than trying to reserve/
  // track the header's own scroll-driven show/hide, which left a dead gap
  // when the two states disagreed) — the underlying chromeHidden scroll
  // tracking keeps running regardless, so closing either one returns to
  // whatever visibility plain scrolling would already have produced.
  const chromeVisible = !chromeHidden && !chaptersOpen && !notesPanel;
  const railInsetPx = isMobile ? 12 : 16;
  // Bumped from the old single-line top bar to fit a book-title +
  // current-section subtitle now that the icon rail has merged into it.
  const topBarHeightPx = isMobile ? 60 : 64;
  // Static now rather than conditional on chromeVisible: the header is a
  // fixed overlay that can reappear over the content at any moment on
  // upward scroll, so the scroll area always reserves their space instead
  // of the content reflowing underneath them when they're hidden.
  const contentPad = isMobile ? "px-5" : "px-10";
  const contentTopPad = topBarHeightPx + (isMobile ? 28 : 48);
  // Reserves room for the docked ChapterNavFooter — a floating overlay
  // (like the header) that only surfaces once the reader reaches the
  // bottom of the section, so the last bit of text isn't covered when it
  // slides into view.
  const contentBottomPad = isMobile ? 88 : 96;

  return (
    <div
      data-reader-theme={theme}
      className="w-full h-screen box-border flex flex-col overflow-hidden relative font-sans"
    >
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <ReaderHeader
          visible={chromeVisible}
          topBarHeightPx={topBarHeightPx}
          railInsetPx={railInsetPx}
          bookTitle={book.metadata.title}
          bookAuthor={book.metadata.author}
          chaptersOpen={chaptersOpen}
          onToggleChapters={() => setChaptersOpen((o) => !o)}
          hasNarration={hasNarration}
          isListen={isListen}
          onListen={() => openBook(book)}
          onToggleSearch={() => setSearchOpen((o) => !o)}
          theme={theme}
          onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")}
          scrollPct={scrollPct}
        />

        {/* Chapters drawer, content column, and notes panel live side by
            side — both drawers are persistent push-drawers (flex siblings
            with an animated width) on desktop, not scrim overlays, so
            opening either narrows the reading column instead of blocking
            it. See the notes panel's own comment below for its mobile
            fallback (a bottom sheet, since there's no room to push there). */}
        <div className="w-full h-full flex overflow-hidden">
          <ChaptersDrawer
            book={book}
            scrollPct={scrollPct}
            activeSectionId={activeSectionForSidebar}
            isMobile={isMobile}
            open={chaptersOpen}
            onNavigate={(id) => goToSection(id, { animate: false })}
            onClose={() => setChaptersOpen(false)}
          />

          {/* Content column */}
          <div
            className={`flex-1 min-w-0 h-full flex flex-col relative transition-opacity duration-300 ${
              isMobile && chaptersOpen ? "opacity-50" : "opacity-100"
            }`}
            style={{ background: "var(--reader-bg)" }}
          >
            <BookContent
              book={book}
              activeIndex={activeIndex}
              registerSlide={registerSlide}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onAnyClick={() => setChromeHidden((hidden) => !hidden)}
              contentPad={contentPad}
              contentWidth={contentWidth}
              contentTopPad={contentTopPad}
              contentBottomPad={contentBottomPad}
              orderedSections={orderedSections}
              notesIndexSectionId={notesIndexSectionId}
              notesIndexGroups={notesIndexGroups}
              getAnnotations={getAnnotations}
              fontSize={fontSize}
              lineHeight={lineHeight}
              fontFamilyVar={fontFamilyVar}
              notesById={notesById}
              onNoteClick={onNoteClick}
              onTextSelect={onTextSelect}
              onNoteMarkerClick={onNoteMarkerClick}
            />

            <ChapterNavFooter
              prevSection={prevSection}
              nextSection={nextSection}
              onPrev={prev}
              onNext={next}
              // Also hidden for as long as a selection is active — on
              // mobile the selection pill is itself a fixed bottom bar (see
              // SelectionMenu.tsx), and would otherwise land directly on
              // top of this one if the reader selects text right at the
              // end of a section.
              visible={atBottom && !selection}
              bottomOffsetPx={anyPlayerActive ? playerHeight : 0}
            />

            {/* Selection menu is a fixed-position overlay, so it doesn't need
                to live inside BookContent's scrollable tree; keeping it here
                means selecting text never forces the (memoized) book content
                to re-render. Selecting text (some or all of an existing
                mark, or fresh) is the only way to reach the full action set
                — Highlight/Note/Copy/Delete; clicking an existing mark
                instead (PassageContent's onNoteMarkerClick) just opens its
                thread directly, no menu. */}
            {selection && (
              <SelectionMenu
                anchor={selection.anchor}
                isMobile={isMobile}
                bottomOffsetPx={anyPlayerActive ? playerHeight : 0}
                theme={theme}
                items={
                  [
                    { key: "highlight", icon: <Highlighter size={isMobile ? 18 : 14} />, label: "Highlight", onClick: highlightSelection },
                    { key: "note", icon: <MessageCircle size={isMobile ? 18 : 14} />, label: "Note", onClick: noteFromSelection },
                    { key: "copy", icon: <Copy size={isMobile ? 18 : 14} />, label: copyLabel, onClick: menuCopy },
                    ...(hasExistingAnnotation
                      ? [{ key: "delete", icon: <Trash2 size={isMobile ? 18 : 14} />, label: "Delete", onClick: deleteSelection, danger: true }]
                      : []),
                  ] as Item[]
                }
                onDismiss={dismissSelection}
              />
            )}

            {searchOpen && (
              <div className="absolute inset-0 z-50">
                <SearchModal
                  book={book}
                  currentSectionId={activeSectionForSidebar}
                  onNavigate={(sectionId, passageId) => {
                    goToSection(sectionId, { animate: false });
                    requestAnimationFrame(() => {
                      getSlideEl(sectionId)
                        ?.querySelector(`[data-passage-id="${passageId}"]`)
                        ?.scrollIntoView({ behavior: "auto", block: "center" });
                    });
                  }}
                  onClose={() => setSearchOpen(false)}
                />
              </div>
            )}

            {noteOpen && (
              <FootnotePopover
                note={noteOpen.note}
                top={noteOpen.top}
                left={noteOpen.left}
                onClose={() => setNoteOpen(null)}
              />
            )}
          </div>

          {/* Notes panel — a push-drawer on desktop (mirrors ChaptersDrawer,
              opposite side: a flex sibling with an animated width that
              narrows the content column instead of floating over it) and a
              non-blocking bottom-sheet overlay on mobile, where there's no
              room to push sideways. The min-[860px] breakpoint (not the
              isMobile prop) is what picks between them, same reasoning as
              ChaptersDrawer's own: isMobile is false on every first render
              and only flips after mount, so a JS-gated swap here would
              flash the wrong layout for a frame. Always mounted (even with
              nothing to show) so the width can actually transition instead
              of popping open/closed. */}
          <div
            className={`fixed inset-0 z-[70] overflow-hidden pointer-events-none min-[860px]:static min-[860px]:inset-auto min-[860px]:h-full min-[860px]:flex-none min-[860px]:transition-[width] min-[860px]:duration-300 min-[860px]:ease-out ${
              notesPanel ? "min-[860px]:w-95" : "min-[860px]:w-0"
            }`}
          >
            {notesPanel && (
              <NotesSidebar
                bookId={book.id}
                passageId={notesPanel.passageId}
                getPassageText={getPassageText}
                annotationId={notesPanel.annotationId}
                pendingRanges={notesPanel.ranges}
                editingNoteId={notesPanel.editingNoteId}
                panelType={isMobile ? "sheet" : "side"}
                citation={
                  currentSectionLabel ? `${book.metadata.title} · ${currentSectionLabel}` : book.metadata.title
                }
                onClose={closeNotesPanel}
              />
            )}
          </div>
        </div>
      </div>

      {currentPlayingPassageId && awayFromNarration && (
        <BackToCurrentButton bottom={playerHeight + 16} direction={nudgeDirection} onClick={jumpToNarration} />
      )}

      {/* Masks the reader until theme/font/position (hydrated) and scroll
          position (resumeReady) all reflect real saved state, so nothing
          the reader would notice snapping into place is ever visible. Loader
          paints its own background from the same --reader-bg token this
          div's data-reader-theme ancestor already provides, so it's already
          showing the right theme by the time it's revealed. Kept mounted
          (not conditionally rendered) so the opacity transition actually
          plays. */}
      <div
        aria-hidden={isReady}
        className={`absolute inset-0 z-[100] transition-opacity duration-300 ${
          isReady ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <Loader label="Loading book…" />
      </div>
    </div>
  );
}
