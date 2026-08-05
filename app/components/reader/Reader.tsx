"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Highlighter, MessageCircle, Share, Trash2 } from "lucide-react";
import NotesSidebar from "./NotesSidebar";
import BookAnnotationFeedPanel from "./notes/BookAnnotationFeedPanel";
import type { FeedEntry } from "@/lib/reader/annotationFeed";
import SearchModal from "../SearchModal";
import FootnotePopover from "./FootnotePopover";
import ShareQuoteModal from "./ShareQuoteModal";
import type { NoteLookup } from "./PassageContent";
import BookContent from "./BookContent";
import ReaderHeader from "./ReaderHeader";
import ChaptersDrawer from "./ChaptersDrawer";
import ChapterNavFooter from "./ChapterNavFooter";
import SelectionMenu, { type Item } from "./SelectionMenu";
import BackToCurrentButton from "./BackToCurrentButton";
import Loader from "../Loader";
import type { BookDocument, Passage, Section } from "@/lib/book/schema";
import {
  FONT_FAMILY_VARS,
  FONT_SIZE_PX_RANGE,
  contentWidthPxFromScale,
  fontSizePxFromScale,
  lineHeightFromScale,
  useReaderStore,
} from "@/stores/reader-store";
import { useReadingPositionStore } from "@/stores/reading-position-store";
import { useLayoutStore } from "@/stores/layout-store";
import { useAudioStore } from "@/stores/audio-store";
import { useNarrationStore } from "@/stores/narration-store";
import { buildSectionsById } from "@/lib/reader/sections";
import { useSectionCarousel } from "@/lib/reader/useSectionCarousel";
import { useResumeScroll } from "@/lib/reader/useResumeScroll";
import { useReadingProgress } from "@/lib/reader/useReadingProgress";
import { useTextAnnotations } from "@/lib/reader/useTextAnnotations";
import { useBookAnnotationFeed } from "@/lib/reader/useBookAnnotationFeed";
import { useContinueReading } from "@/lib/auth/useContinueReading";
import { quoteForRanges } from "@/lib/reader/annotationSelection";
import { sectionLabel } from "@/lib/reader/sectionHeading";

export default function Reader({
  book,
  materialId,
  targetSectionId,
  targetPassageId,
  targetNoteId,
  autoListen,
  onClose,
}: {
  book: BookDocument;
  /** The book's real `materials.id` (UUID) — distinct from `book.id`
   * (ingestion's own slug-like internal id, api-spec.md). Everything that
   * reads/writes reading position (reading-position-store, audio-store's
   * "now playing" slot) keys off this, never `book.id`. */
  materialId: string;
  /** ?section=<id> from the book-detail page's chapter links — see
   * useResumeScroll's own doc comment for why this never touches the saved
   * resume position. */
  targetSectionId?: string;
  /** ?passage=<id> — the home community feed's deep links, narrowing
   * targetSectionId down to one specific passage instead of that
   * section's first one. */
  targetPassageId?: string;
  /** ?note=<annotationId> — paired with targetPassageId, opens that
   * specific annotation's thread once the reader has landed, the same as
   * clicking its inline marker would (see the deep-link effect below). */
  targetNoteId?: string;
  /** ?listen=1 — the book-detail page's own Listen button hands this
   * intent off through the URL rather than calling openBook itself,
   * because getting here now means a real navigation (see its own
   * hardNavigate comment), and audio-store's `book` field isn't persisted
   * across one (only `speed` is). Acted on once, below, the same as
   * ReaderHeader's own onListen={() => openBook(book)}. */
  autoListen?: boolean;
  /** Present only when Reader is mounted inside the (.)read/[slug] modal
   * (ReaderModal.tsx) rather than as the standalone /read/[slug] page —
   * swaps the header's "back to home" link for a plain close button, so
   * closing an overlay never masquerades as a real page navigation. Absent
   * on the standalone route, where the existing Link-to-home is still
   * correct (there's no overlay to close, just a page to leave). */
  onClose?: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const [chaptersOpen, setChaptersOpen] = useState(false);
  // Set from either the fresh-selection pill's Share action or NotesSidebar's
  // "Share passage" menu item — both just need the quote text; author/book
  // title/cover come straight from `book` below, the same for either entry
  // point.
  const [shareQuote, setShareQuote] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState<{ note: NoteLookup; top: number; left: number } | null>(
    null
  );
  // See openNoteMarker's own comment below — whether the currently-open
  // notesPanel should be exempted from the usual "notes panel open ⇒ hide
  // header" rule (chromeVisible, further down).
  const [notesPanelKeepsHeader, setNotesPanelKeepsHeader] = useState(false);

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
  } = useTextAnnotations(materialId);

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

  // See autoListen's own doc comment above — a one-time echo of what
  // ReaderHeader's onListen does on click, fired instead on mount when the
  // book-detail page's Listen button is why we're here.
  useEffect(() => {
    if (autoListen && !isListen) openBook(book, materialId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately fires once on mount only; autoListen/book/materialId are fixed for this page's lifetime, and isListen is read once as a mount-time guard, not tracked afterward.
  }, []);

  const narrationAudioIndex = useNarrationStore((s) => s.audioIndex);
  const narrationAudioSection = useNarrationStore((s) => s.audioSection);
  const currentPlayingPassageId = useNarrationStore((s) => s.currentPlayingPassageId);

  // These stores skip automatic persist hydration (see their own comments)
  // specifically so the server and the client's first paint render
  // identical output — pulling in the real localStorage values here, once,
  // right after mount, is what actually restores them. `hydrated` gates the
  // loading overlay below — without it, the reader would paint once with
  // default theme/font/position and then visibly snap to the real
  // persisted values a moment later.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    Promise.all([useReaderStore.persist.rehydrate(), useReadingPositionStore.persist.rehydrate()])
      .catch(() => {}) // a storage read failure shouldn't hang the reader
      .then(() => setHydrated(true));
  }, []);

  // Seeds reading-position-store's local mirror from the server (see
  // useContinueReading's own doc comment) for a reader who opened this book
  // directly rather than via the home feed's Continue Reading rail — the
  // returned list itself isn't used here, only the hydration side effect.
  useContinueReading();

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

  const noteFeed = useBookAnnotationFeed({ materialId, orderedSections, passageLookup });

  // Published so NowPlayingBar (rendered in the root layout, well outside
  // this tree) can pull its own right edge in on desktop — see
  // layout-store's own doc comment on readerPanelOpen. Same condition that
  // drives the notes-panel wrapper's shell:w-95/shell:w-0 toggle below, so
  // the two can't drift out of sync with each other.
  const setReaderPanelOpen = useLayoutStore((s) => s.setReaderPanelOpen);
  useEffect(() => {
    setReaderPanelOpen(!!notesPanel || noteFeed.open);
    return () => setReaderPanelOpen(false);
  }, [notesPanel, noteFeed.open, setReaderPanelOpen]);

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
    materialId,
    sectionsById,
    orderedSections,
    goTo,
    getSlideEl,
    targetSectionId,
    targetPassageId,
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
    materialId,
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
  const prevSection = orderedSections[activeIndex - 1];
  const nextSection = orderedSections[activeIndex + 1];
  const getPassageText = useCallback(
    (passageId: string) => passageLookup.byId.get(passageId)?.text ?? "",
    [passageLookup]
  );
  // Same "navigate, then scroll within the freshly-mounted slide a frame
  // later" idiom already used identically by useResumeScroll, the
  // narration-follow effect, and SearchModal's own onNavigate — centers on
  // the exact highlighted span (not just the top of its passage), since
  // that's the thing the reader actually followed here to see.
  //
  // A passage can hold more than one distinct highlight though, so landing
  // on the passage alone doesn't say which range was clicked — that's what
  // justJumpedAnnotationId + .reader-jump-flash (PassageContent.tsx,
  // globals.css) are for: the initial pulse is a one-shot 2.4s CSS
  // animation, but it settles into (and holds, `animation-fill-mode:
  // forwards`) the ordinary steady wash rather than fading out — so
  // whichever panel sent the reader here (the book-wide feed's quote
  // cards, or a deep link's own note thread) can keep that wash live for
  // as long as *it* stays open, not just for the animation's own runtime.
  // That's what the effect below this actually clears it on: neither panel
  // still open, not a timer. No toast; the flash+held wash is confirmation
  // enough on its own.
  const [justJumpedAnnotationId, setJustJumpedAnnotationId] = useState<string | null>(null);
  useEffect(() => {
    if (!notesPanel && !noteFeed.open) setJustJumpedAnnotationId(null);
  }, [notesPanel, noteFeed.open]);
  const jumpToFeedEntry = (entry: FeedEntry) => {
    goToSection(entry.sectionId, { animate: false });
    requestAnimationFrame(() => {
      getSlideEl(entry.sectionId)
        ?.querySelector(`[data-annotation-id="${entry.annotation.id}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    setJustJumpedAnnotationId(entry.annotation.id);
  };

  // Opens a specific annotation's thread exactly the way clicking its
  // inline marker already does (closing the book feed first, so the two
  // notes surfaces never fight for the same panel slot) — shared by that
  // real marker click below and by the deep-link effect further down, so
  // there's exactly one implementation of "open this annotation".
  //
  // `keepHeaderVisible` is what tells chromeVisible (below) whether this
  // particular notesPanel open should still hide the header the normal way.
  // A reader who taps a marker mid-book already has full context for where
  // they are, so the header tucking away to give the notes panel room is
  // the right call there. A reader who just arrived via the home feed's
  // deep link has none of that yet — the header (with its close button and
  // book title) is the only thing orienting them in a book they didn't
  // choose to open themselves, so it stays up despite the same notesPanel
  // being open. Defaults to false rather than a second wrapper function, so
  // there's still exactly one "open this annotation" implementation, not two.
  const openNoteMarker = (
    passageId: string,
    annotationId: string,
    opts?: { keepHeaderVisible?: boolean; expandAll?: boolean }
  ) => {
    noteFeed.close();
    onNoteMarkerClick(passageId, annotationId, { expandAll: opts?.expandAll });
    setNotesPanelKeepsHeader(Boolean(opts?.keepHeaderVisible));
  };

  // Arriving from an external deep link (the home community feed) that
  // names a specific note — once the reader has actually landed on the
  // right passage (isReady, same gate the loader itself waits on), open
  // that annotation's thread the same way clicking its marker would. A
  // ref guard keeps this to once per page load, same idiom as
  // BookAnnotationFeedPanel's own once-on-open positioning effect.
  //
  // useResumeScroll only lands on the *passage's* top (block: "start") —
  // it has no notion of which highlight within that passage the reader
  // actually followed the link for. This re-centers on the exact
  // [data-annotation-id] span and flashes it, same as jumpToFeedEntry does
  // for in-reader jumps, so a deep link into a long passage doesn't strand
  // the reader above the highlight it promised.
  const hasOpenedTargetNoteRef = useRef(false);
  useEffect(() => {
    if (hasOpenedTargetNoteRef.current) return;
    if (!isReady || !targetSectionId || !targetPassageId || !targetNoteId) return;
    hasOpenedTargetNoteRef.current = true;
    requestAnimationFrame(() => {
      getSlideEl(targetSectionId)
        ?.querySelector(`[data-annotation-id="${targetNoteId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    setJustJumpedAnnotationId(targetNoteId);
    openNoteMarker(targetPassageId, targetNoteId, { keepHeaderVisible: true, expandAll: true });
    // The centering scroll above is a *programmatic* jump, but
    // useSectionCarousel's own scroll listener (lib/reader/useSectionCarousel.ts)
    // can't tell that apart from the reader scrolling themselves — a downward
    // jump (the annotation sitting below the passage's start) flips
    // chromeHidden true mid-animation, undoing keepHeaderVisible a moment
    // after it was just set. This is what made the header's visibility feel
    // inconsistent: whether it stuck depended on how far the jump had to
    // scroll. Reasserting it once more, after the smooth scroll has had time
    // to settle, is what makes keepHeaderVisible actually win.
    const chromeReassertTimeout = setTimeout(() => setChromeHidden(false), 500);
    return () => clearTimeout(chromeReassertTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately fires once, when isReady first becomes true with both target props present; openNoteMarker/onNoteMarkerClick/getSlideEl/setChromeHidden close over stable-enough identity for this one-shot purpose.
  }, [isReady, targetSectionId, targetPassageId, targetNoteId]);

  const onNoteClick = useCallback((note: NoteLookup, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    setNoteOpen({
      note,
      top: rect.bottom + 6,
      left: Math.min(window.innerWidth - 336, Math.max(8, rect.left - 140)),
    });
  }, []);

  const menuCopy = () => {
    if (!selection) return;
    const text = quoteForRanges(selection.ranges, getPassageText);
    navigator.clipboard.writeText(text).then(() => {
      setCopyLabel("Copied ✓");
      setTimeout(() => {
        setCopyLabel("Copy");
        dismissSelection();
      }, 800);
    });
  };

  // The outline (and, same reasoning, the notes panel) forces the header
  // away for as long as either is open (rather than trying to reserve/
  // track the header's own scroll-driven show/hide, which left a dead gap
  // when the two states disagreed) — the underlying chromeHidden scroll
  // tracking keeps running regardless, so closing either one returns to
  // whatever visibility plain scrolling would already have produced.
  // notesPanelKeepsHeader is the one exception to "notes panel open ⇒ hide
  // header" — see openNoteMarker's own comment.
  const chromeVisible =
    !chromeHidden && !chaptersOpen && !(notesPanel && !notesPanelKeepsHeader) && !noteFeed.open;
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
  // Bumped from 88 — ChapterNavFooter now also pads itself for the
  // home-indicator safe area on notched phones, so it can render a bit
  // taller there than this used to assume.
  const contentBottomPad = isMobile ? 104 : 96;
  // The reader's own font-size scale (fontSize above) is one shared px
  // value across every breakpoint — a book read at the same nominal size on
  // a phone still feels noticeably larger than on desktop, both because
  // there's less surrounding whitespace to offset it against and because
  // it's typically held closer. A small flat trim on mobile only (not a
  // rescale of the whole slider) brings passage text back in line with how
  // it reads on desktop, without changing what "40" on the size control
  // means for anyone on a larger screen.
  const passageFontSize = isMobile ? Math.max(FONT_SIZE_PX_RANGE.min, fontSize - 1.5) : fontSize;

  return (
    <div
      data-reader-theme={theme}
      // h-dvh, not h-screen (100vh): mobile Safari's 100vh is the height
      // with its own bottom toolbar collapsed, i.e. taller than what's
      // actually visible while that toolbar is showing — this container's
      // real height came out larger than the visible viewport, so
      // ChapterNavFooter (absolute, pinned to *its* bottom edge) rendered
      // partly or fully below the fold behind Safari's own chrome. 100dvh
      // tracks the actual visible viewport live as the toolbar shows/hides.
      className="w-full h-dvh box-border flex flex-col overflow-hidden relative font-sans"
    >
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <ReaderHeader
          visible={chromeVisible}
          topBarHeightPx={topBarHeightPx}
          railInsetPx={railInsetPx}
          onClose={onClose}
          bookSlug={book.slug}
          bookTitle={book.metadata.title}
          bookAuthor={book.metadata.author}
          chaptersOpen={chaptersOpen}
          onToggleChapters={() => setChaptersOpen((o) => !o)}
          hasNarration={hasNarration}
          isListen={isListen}
          onListen={() => openBook(book, materialId)}
          noteFeedCount={noteFeed.totalNoteCount}
          onToggleNoteFeed={() => {
            if (noteFeed.open) noteFeed.close();
            else {
              closeNotesPanel();
              noteFeed.openFeed();
            }
          }}
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
              fontSize={passageFontSize}
              lineHeight={lineHeight}
              fontFamilyVar={fontFamilyVar}
              notesById={notesById}
              onNoteClick={onNoteClick}
              onTextSelect={onTextSelect}
              onNoteMarkerClick={openNoteMarker}
              justJumpedAnnotationId={justJumpedAnnotationId}
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
                    {
                      key: "note",
                      icon: <MessageCircle size={isMobile ? 18 : 14} />,
                      label: "Note",
                      onClick: () => {
                        noteFeed.close();
                        noteFromSelection();
                      },
                    },
                    { key: "copy", icon: <Copy size={isMobile ? 18 : 14} />, label: copyLabel, onClick: menuCopy },
                    {
                      key: "share",
                      icon: <Share size={isMobile ? 18 : 14} />,
                      label: "Share",
                      onClick: () => {
                        setShareQuote(quoteForRanges(selection.ranges, getPassageText));
                        dismissSelection();
                      },
                    },
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

            {shareQuote !== null && (
              <div className="absolute inset-0 z-50">
                <ShareQuoteModal
                  quote={shareQuote}
                  author={book.metadata.author}
                  bookTitle={book.metadata.title}
                  coverSrc={book.metadata.cover}
                  onClose={() => setShareQuote(null)}
                />
              </div>
            )}
          </div>

          {/* Notes panel — a push-drawer on desktop (mirrors ChaptersDrawer,
              opposite side: a flex sibling with an animated width that
              narrows the content column instead of floating over it) and a
              non-blocking bottom-sheet overlay on mobile, where there's no
              room to push sideways. The shell: breakpoint (not the
              isMobile prop) is what picks between them, same reasoning as
              ChaptersDrawer's own: isMobile is false on every first render
              and only flips after mount, so a JS-gated swap here would
              flash the wrong layout for a frame. Always mounted (even with
              nothing to show) so the width can actually transition instead
              of popping open/closed. */}
          <div
            className={`fixed inset-0 z-[70] overflow-hidden pointer-events-none shell:static shell:inset-auto shell:h-full shell:flex-none shell:transition-[width] shell:duration-300 shell:ease-out ${
              notesPanel || noteFeed.open ? "shell:w-95" : "shell:w-0"
            }`}
          >
            {noteFeed.open && (
              <BookAnnotationFeedPanel
                materialId={materialId}
                groups={noteFeed.groups}
                filter={noteFeed.filter}
                onFilterChange={noteFeed.setFilter}
                totalNoteCount={noteFeed.totalNoteCount}
                passageCount={noteFeed.passageCount}
                activeSectionId={activeSectionId}
                onJump={jumpToFeedEntry}
                getPassageText={getPassageText}
                panelType={isMobile ? "sheet" : "side"}
                onClose={noteFeed.close}
              />
            )}
            {notesPanel && (
              <NotesSidebar
                // Forces a remount whenever the panel switches to a
                // different thread — e.g. clicking straight from one note
                // marker to another without closing the panel first — so
                // EditPanel's own state (its drill-down stack in
                // particular) can't leak from one thread's view into
                // another's.
                key={notesPanel.annotationId ?? JSON.stringify(notesPanel.ranges)}
                materialId={materialId}
                passageId={notesPanel.passageId}
                getPassageText={getPassageText}
                annotationId={notesPanel.annotationId}
                pendingRanges={notesPanel.ranges}
                editingNoteId={notesPanel.editingNoteId}
                expandAll={notesPanel.expandAll}
                panelType={isMobile ? "sheet" : "side"}
                onClose={closeNotesPanel}
                onShare={setShareQuote}
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
          the reader would notice snapping into place is ever visible.
          confined: stays inside this wrapper's own absolute inset-0 rather
          than Loader's normal fixed-to-viewport default — see Loader's own
          doc comment for why that matters specifically inside ReaderModal.
          Kept mounted (not conditionally rendered) so the opacity
          transition actually plays. */}
      <div
        aria-hidden={isReady}
        className={`absolute inset-0 z-[100] transition-opacity duration-300 ${
          isReady ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <Loader confined />
      </div>
    </div>
  );
}
