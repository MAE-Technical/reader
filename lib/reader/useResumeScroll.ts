import { useEffect, useRef, useState } from "react";
import type { BookDocument, Section } from "@/lib/book/schema";
import { resolveSpineTarget } from "@/lib/reader/sections";
import { useReadingPositionStore } from "@/stores/reading-position-store";

/**
 * Resumes a book where the reader last left off. Once the carousel's slides
 * have mounted, jumps straight to the saved section (no transition — the
 * reader never asked for this move visually) and scrolls to the saved
 * passage within that slide. The saved position itself (which section
 * narration/audio considers "current") lives in reading-position-store,
 * keyed by `materialId` (not `book.id` — see Reader.tsx's own doc comment),
 * and needs no separate seeding here — the global narration engine
 * (lib/audio/NarrationEngine.tsx) reads the same position directly.
 *
 * Returns whether the resume attempt (successful or not — an unsaved book
 * has nothing to resume) has finished, so a caller can hold off revealing
 * the reader until it has.
 *
 * `targetSectionId` (the book-detail page's chapter links, `?section=`)
 * overrides the saved position for this one jump — deliberately never
 * written back to reading-position-store, so a reader just previewing a
 * chapter link doesn't clobber their real bookmark. It's resolved through
 * `resolveSpineTarget` first, same as the in-reader chapters drawer's own
 * `navigateToSection` (Reader.tsx) — a `?section=` link can legitimately
 * name a grouping node with no passages of its own (a pure Part divider),
 * which `orderedSections` (spine-only) has no entry for at all, so landing
 * on it directly would silently no-op and leave the saved/default position
 * in place instead. `targetPassageId` (the home community feed's deep
 * links, `?passage=`) narrows that further to one specific passage within
 * the section, instead of always landing on the section's first passage.
 */
export function useResumeScroll({
  book,
  materialId,
  sectionsById,
  orderedSections,
  goTo,
  getSlideEl,
  targetSectionId,
  targetPassageId,
}: {
  book: BookDocument;
  materialId: string;
  sectionsById: Map<string, Section>;
  orderedSections: Section[];
  goTo: (index: number, opts?: { animate?: boolean }) => void;
  getSlideEl: (id: string) => HTMLDivElement | undefined;
  targetSectionId?: string;
  targetPassageId?: string;
}) {
  const getPosition = useReadingPositionStore((s) => s.getPosition);
  const hasScrolledToResumeRef = useRef(false);
  const [resumed, setResumed] = useState(false);

  useEffect(() => {
    if (hasScrolledToResumeRef.current) return;
    const stored = targetSectionId
      ? (() => {
          const resolved = resolveSpineTarget(targetSectionId, book.sections, book.spine);
          return resolved ? { sectionId: resolved, passageIndex: 0 } : null;
        })()
      : getPosition(materialId);
    const sectionIndex = stored ? orderedSections.findIndex((s) => s.id === stored.sectionId) : -1;
    const passageId =
      targetPassageId ?? (stored ? sectionsById.get(stored.sectionId)?.passages[stored.passageIndex]?.id : undefined);
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
  }, [book.id, materialId, orderedSections.length, targetSectionId, targetPassageId]);

  return resumed;
}
