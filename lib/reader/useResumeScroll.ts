import { useEffect, useRef, useState } from "react";
import type { BookDocument, Section } from "@/lib/book/schema";
import { useLibraryStore } from "@/stores/library-store";

/**
 * Resumes a book where the reader last left off. Once the carousel's slides
 * have mounted, jumps straight to the saved section (no transition — the
 * reader never asked for this move visually) and scrolls to the saved
 * passage within that slide. The saved position itself (which section
 * narration/audio considers "current") lives in library-store and needs no
 * separate seeding here — the global narration engine (lib/audio/
 * NarrationEngine.tsx) reads the same per-book position directly.
 *
 * Returns whether the resume attempt (successful or not — an unsaved book
 * has nothing to resume) has finished, so a caller can hold off revealing
 * the reader until it has.
 *
 * `targetSectionId` (the book-detail page's chapter links, `?section=`)
 * overrides the saved position for this one jump — deliberately never
 * written back to library-store, so a reader just previewing a chapter link
 * doesn't clobber their real bookmark.
 */
export function useResumeScroll({
  book,
  sectionsById,
  orderedSections,
  goTo,
  getSlideEl,
  targetSectionId,
}: {
  book: BookDocument;
  sectionsById: Map<string, Section>;
  orderedSections: Section[];
  goTo: (index: number, opts?: { animate?: boolean }) => void;
  getSlideEl: (id: string) => HTMLDivElement | undefined;
  targetSectionId?: string;
}) {
  const getPosition = useLibraryStore((s) => s.getPosition);
  const hasScrolledToResumeRef = useRef(false);
  const [resumed, setResumed] = useState(false);

  useEffect(() => {
    if (hasScrolledToResumeRef.current) return;
    const stored = targetSectionId ? { sectionId: targetSectionId, passageIndex: 0 } : getPosition(book.id);
    const sectionIndex = stored ? orderedSections.findIndex((s) => s.id === stored.sectionId) : -1;
    const passageId = stored ? sectionsById.get(stored.sectionId)?.passages[stored.passageIndex]?.id : undefined;
    if (!stored || sectionIndex < 0 || !passageId) {
      hasScrolledToResumeRef.current = true;
      // Deferred a frame (rather than set synchronously here) purely to
      // satisfy the no-setState-in-effect-body rule — nothing here depends
      // on timing, unlike the resume-found branch below.
      const raf = requestAnimationFrame(() => setResumed(true));
      return () => cancelAnimationFrame(raf);
    }
    goTo(sectionIndex, { animate: false });
    const raf = requestAnimationFrame(() => {
      getSlideEl(stored.sectionId)
        ?.querySelector(`[data-passage-id="${passageId}"]`)
        ?.scrollIntoView({ behavior: "auto", block: "start" });
      hasScrolledToResumeRef.current = true;
      setResumed(true);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id, orderedSections.length, targetSectionId]);

  return resumed;
}
