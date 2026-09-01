import { useCallback, useEffect, useMemo, useRef } from "react";
import type { BookDocument, Section } from "@/lib/book/schema";
import { useReadingPositionStore } from "@/stores/reading-position-store";
import { buildProgressShape, computeBookProgress } from "@/lib/reader/progress";

// Only committed to the store after scrolling has settled for this long —
// resets on every scroll event, so continuous scrolling never writes at
// all until the reader actually stops, matching listen mode's own
// occasional (not every-frame) position writes.
const SETTLE_MS = 600;

/**
 * Plain-reading counterpart to the narration engine's position tracking.
 * Listen mode always knew exactly where the reader was (the playback
 * clock); reading mode previously only recorded which *section* was
 * active, resetting to its first passage on every navigation — so
 * resuming a book mid-chapter always dropped the reader back at the top
 * of the chapter, never the paragraph they'd actually stopped at.
 *
 * Two things happen here, both mirroring the section-only tracking this
 * replaced:
 *  - A genuine navigation to a *different* section starts back at its
 *    first passage — unless the stored position already points at the
 *    section being entered, in which case that's useResumeScroll's own
 *    jump landing (or the reader returning to a section they'd already
 *    made progress in), and the existing passageIndex is preserved rather
 *    than being stomped back to 0.
 *  - While remaining in one section, scroll position refines passageIndex
 *    further: "whichever passage is still visible at the very top of the
 *    viewport" is treated as the resume point, committed (debounced) the
 *    same way the narration engine commits `audioTimeMs` as playback
 *    advances.
 *
 * Deliberately never writes from an effect's *cleanup* — only from its
 * setup (the section-change branch) and from real 'scroll'/
 * 'visibilitychange' events. Cleanup runs on every dependency change
 * (including React StrictMode's dev-only double-invoke on mount), not just
 * "the reader is genuinely leaving," so a write there was landing stale/
 * premature positions unrelated to anything the reader actually did.
 */
export function useReadingProgress({
  book,
  materialId,
  mode,
  activeSectionId,
  activeSection,
  getSlideEl,
  resumeReady,
}: {
  book: BookDocument;
  materialId: string;
  mode: "read" | "listen";
  activeSectionId: string | undefined;
  activeSection: Section | undefined;
  getSlideEl: (id: string) => HTMLDivElement | undefined;
  /** Whether useResumeScroll has finished landing the reader on their real
   * saved section/passage (Reader.tsx) — this hook has to stay off until
   * then. useResumeScroll's own `goTo` (jumping the carousel off its
   * SSR-safe default onto the real saved section) is itself a section
   * *change* exactly like a genuine reader navigation is, and the
   * section-change branch below can't yet tell the two apart while the
   * position store is still mid-hydration: it was reading `getPosition` as
   * empty, defaulting to `passageIndex: 0`, and writing that back with a
   * fresh timestamp — a wrong local value that then looked *newer* than
   * the real saved position, permanently blocking the correct one from
   * ever being applied. Waiting for resume to actually finish is what
   * keeps that resume-triggered jump from ever reaching this hook as a
   * "navigation" at all. */
  resumeReady: boolean;
}) {
  const getPosition = useReadingPositionStore((s) => s.getPosition);
  const setPosition = useReadingPositionStore((s) => s.setPosition);
  const previousSectionRef = useRef<string | null>(null);
  const progressShape = useMemo(() => buildProgressShape(book), [book]);
  const progressPercentFor = useCallback(
    (position: { sectionId: string; passageIndex: number }) =>
      Math.round(computeBookProgress(progressShape, position) * 100),
    [progressShape]
  );

  // Kept in sync every render (not read as an effect dependency below) —
  // `activeSection` is a fresh object identity every time useProgressiveText
  // swaps in more real prose (most notably its one-time "rest of the book"
  // background load, which lands moments after the reader arrives, right
  // when they're first settling in to read). Depending on the object itself
  // was tearing the effect below down and rebuilding it — including the
  // scroll listener and, critically, cancelling any pending debounced write
  // via the cleanup fn — every time that happened, which routinely ate the
  // very first scroll-settle write of a session. computePassageIndex reads
  // this ref at call time instead, so it always sees current passages
  // without needing `activeSection` itself in the dependency array.
  const activeSectionRef = useRef(activeSection);
  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  useEffect(() => {
    if (mode !== "read" || !activeSectionId || !activeSectionRef.current || !resumeReady) return;

    const previous = previousSectionRef.current;
    previousSectionRef.current = activeSectionId;
    // `previous === null` is the very first section observed after mount —
    // whether that's book.spine[0] or wherever useResumeScroll is about to
    // jump to — left alone rather than written back on its own.
    if (previous !== null && previous !== activeSectionId) {
      const existing = getPosition(materialId);
      const passageIndex = existing?.sectionId === activeSectionId ? existing.passageIndex : 0;
      const position = { sectionId: activeSectionId, passageIndex };
      setPosition(materialId, position, progressPercentFor(position));
    }

    const el = getSlideEl(activeSectionId);
    if (!el) return;

    const computePassageIndex = (): number | undefined => {
      const section = activeSectionRef.current;
      if (!section) return undefined;
      const passageEls = el.querySelectorAll<HTMLElement>("[data-passage-id]");
      const containerTop = el.getBoundingClientRect().top;
      let lastId: string | undefined;
      for (const p of passageEls) {
        lastId = p.dataset.passageId;
        // The first passage not yet fully scrolled past the viewport's top
        // edge — i.e. whatever's showing right at the top right now.
        if (p.getBoundingClientRect().bottom > containerTop + 8) {
          const idx = section.passages.findIndex((pg) => pg.id === p.dataset.passageId);
          return idx >= 0 ? idx : undefined;
        }
      }
      // Scrolled past every passage (e.g. resting on the "next chapter"
      // footer) — the last one is still the honest resume point, rather
      // than silently leaving whatever passageIndex was tracked earlier.
      const idx = lastId ? section.passages.findIndex((pg) => pg.id === lastId) : -1;
      return idx >= 0 ? idx : undefined;
    };

    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      const passageIndex = computePassageIndex();
      if (passageIndex === undefined) return;
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        const position = { sectionId: activeSectionId, passageIndex };
        setPosition(materialId, position, progressPercentFor(position));
      }, SETTLE_MS);
    };
    el.addEventListener("scroll", onScroll, { passive: true });

    // The tab being hidden (backgrounded/closed) is a genuine "the reader
    // is leaving" signal, unlike an ordinary effect cleanup — safe to
    // recompute and write immediately rather than waiting out the settle
    // timer, so the last few paragraphs read aren't lost if it hasn't
    // fired yet. Recomputes fresh from the DOM rather than caching the
    // last scroll-derived value, since the slide is still mounted and
    // attached for as long as this listener is: no need to guess.
    const onVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      const passageIndex = computePassageIndex();
      if (passageIndex !== undefined) {
        const position = { sectionId: activeSectionId, passageIndex };
        setPosition(materialId, position, progressPercentFor(position));
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (settleTimer) clearTimeout(settleTimer);
      el.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // activeSection deliberately excluded — see activeSectionRef's own
    // comment above; depending on it here is exactly the bug being fixed.
  }, [book.id, materialId, mode, activeSectionId, resumeReady, getSlideEl, getPosition, setPosition, progressPercentFor]);
}
