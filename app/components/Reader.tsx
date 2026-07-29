"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NotesSidebar from "./NotesSidebar";
import SearchModal from "./SearchModal";
import FootnotePopover from "./FootnotePopover";
import type { NoteLookup } from "./PassageContent";
import BookContent from "./reader/BookContent";
import ReaderHeader from "./reader/ReaderHeader";
import ChaptersDrawer from "./reader/ChaptersDrawer";
import ChapterNavFooter from "./reader/ChapterNavFooter";
import SelectionMenu from "./reader/SelectionMenu";
import BackToCurrentButton from "./reader/BackToCurrentButton";
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
    onOpenPassageNotes,
    onEditAnnotation,
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

  const setPosition = useLibraryStore((s) => s.setPosition);

  const narrationAudioIndex = useNarrationStore((s) => s.audioIndex);
  const narrationAudioSection = useNarrationStore((s) => s.audioSection);
  const currentPlayingPassageId = useNarrationStore((s) => s.currentPlayingPassageId);
  const seekToPassageForListening = useNarrationStore((s) => s.seekToPassageForListening);
  const handleWordClick = useNarrationStore((s) => s.handleWordClick);

  // These stores skip automatic persist hydration (see their own comments)
  // specifically so the server and the client's first paint render
  // identical output — pulling in the real localStorage values here, once,
  // right after mount, is what actually restores them. reader-identity-
  // store's rehydrate must land before ensureReaderId, so a returning
  // reader's existing id is reused rather than shadowed by a fresh one.
  useEffect(() => {
    useReaderStore.persist.rehydrate();
    useLibraryStore.persist.rehydrate();
    useReaderIdentityStore.persist.rehydrate();
    useReaderIdentityStore.getState().ensureReaderId();
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
  // chapters drawer is deliberately excluded — it's a persistent push-
  // drawer now, not a blocking overlay, so the reader stays fully
  // navigable (swipe/keyboard) while it's open.
  const navDisabled = searchOpen || Boolean(notesPanel) || Boolean(noteOpen) || Boolean(selection);

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

  useResumeScroll({
    book,
    sectionsById,
    orderedSections,
    goTo,
    getSlideEl,
  });

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

  // Starts listen mode from a specific passage, whether or not this book
  // is already the one playing — sets the resume target first, then opens
  // the book; NarrationEngine's own resume-to-stored-position effect (see
  // its comment) picks that exact spot up on the very next render, rather
  // than this needing to reach into the audio element itself.
  const startListeningFromPassage = useCallback(
    (sectionId: string, passageId: string) => {
      const targetSection = sectionsById.get(sectionId);
      const narratorId = book.narrators[0]?.id;
      const targetTrack = targetSection?.audio?.narratorTracks.find((t) => t.narratorId === narratorId);
      if (!targetSection || !targetTrack) return;
      const passageIndex = targetSection.passages.findIndex((p) => p.id === passageId);
      const word = (targetSection.audio?.words ?? []).find((w) => w.passageId === passageId);
      if (passageIndex >= 0) setPosition(book.id, { sectionId, passageIndex, audioTimeMs: word?.startMs ?? 0 });
      openBook(book);
    },
    [sectionsById, book, setPosition, openBook]
  );

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

  // The outline forces the header away for as long as it's open (rather
  // than the drawer trying to reserve/track the header's own scroll-driven
  // show/hide, which left a dead gap when the two states disagreed) — the
  // underlying chromeHidden scroll tracking keeps running regardless, so
  // closing the drawer returns to whatever visibility plain scrolling
  // would already have produced.
  const chromeVisible = !chromeHidden && !chaptersOpen;
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

        {/* Drawer + content column live side by side — the drawer is a
            persistent push-drawer (a flex sibling with an animated width),
            not a scrim overlay, so opening it narrows the reading column
            instead of blocking it. */}
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
              isListen={isListen}
              fontSize={fontSize}
              lineHeight={lineHeight}
              fontFamilyVar={fontFamilyVar}
              notesById={notesById}
              onNoteClick={onNoteClick}
              onWordClick={handleWordClick}
              seekToPassageForListening={seekToPassageForListening}
              onTextSelect={onTextSelect}
              onNoteMarkerClick={onNoteMarkerClick}
              onOpenPassageNotes={onOpenPassageNotes}
            />

            <ChapterNavFooter
              prevSection={prevSection}
              nextSection={nextSection}
              onPrev={prev}
              onNext={next}
              visible={atBottom}
              bottomOffsetPx={anyPlayerActive ? playerHeight : 0}
            />

            {/* Selection menu is a fixed-position overlay, so it doesn't need
                to live inside BookContent's scrollable tree; keeping it here
                means selecting text never forces the (memoized) book content
                to re-render. Selecting text is the *only* way to start a
                highlight/note/copy (per product decision) — there's no
                separate click-based menu on already-marked text. */}
            {selection && (
              <SelectionMenu
                top={selection.top}
                left={selection.left}
                theme={theme}
                copyLabel={copyLabel}
                onPlay={
                  hasNarration
                    ? () => {
                        const passageId = selection.ranges[0].passageId;
                        const sectionId = passageLookup.sectionOf.get(passageId);
                        if (sectionId) startListeningFromPassage(sectionId, passageId);
                        dismissSelection();
                      }
                    : undefined
                }
                onHighlight={highlightSelection}
                onNote={noteFromSelection}
                onDelete={hasExistingAnnotation ? deleteSelection : undefined}
                onCopy={menuCopy}
                onDismiss={dismissSelection}
              />
            )}

            {notesPanel && (
              <>
                <div
                  onClick={closeNotesPanel}
                  // z-[65]/z-[70] (not z-40/z-50) so this panel — and its
                  // scrim — sit above the fixed "now playing" bar (z-50)
                  // rather than being cut off behind it while audio plays.
                  className={`absolute inset-0 z-[65] ${isMobile ? "bg-black/45" : "bg-black/25"}`}
                />
                <div
                  className={`absolute top-0 bottom-0 z-[70] ${isMobile ? "left-0 w-full" : "right-0 w-95"}`}
                >
                  <NotesSidebar
                    bookId={book.id}
                    passageId={notesPanel.passageId}
                    getPassageText={getPassageText}
                    mode={notesPanel.mode}
                    annotationId={notesPanel.mode === "edit" ? notesPanel.annotationId : undefined}
                    pendingRanges={notesPanel.mode === "edit" ? notesPanel.ranges : undefined}
                    editingNoteId={notesPanel.mode === "edit" ? notesPanel.editingNoteId : undefined}
                    panelType={isMobile ? "sheet" : "side"}
                    citation={
                      currentSectionLabel
                        ? `${book.metadata.title} · ${currentSectionLabel}`
                        : book.metadata.title
                    }
                    onEditAnnotation={(annotationId, noteId) =>
                      onEditAnnotation(notesPanel.passageId, annotationId, noteId)
                    }
                    onClose={closeNotesPanel}
                  />
                </div>
              </>
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
        </div>
      </div>

      {currentPlayingPassageId && awayFromNarration && (
        <BackToCurrentButton bottom={playerHeight + 16} direction={nudgeDirection} onClick={jumpToNarration} />
      )}
    </div>
  );
}
