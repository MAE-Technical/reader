import type { BookDocument } from "@/lib/book/schema";
import type { Position } from "@/stores/reading-position-store";
import { buildSectionsById } from "./sections";

/** Just enough of a book's structure to compute reading progress from a
 * saved Position — spine order plus each section's passage *count* (not its
 * content), so callers that only need a progress bar (a library grid) never
 * have to ship full book text to the client just to get one. */
export type ProgressShape = { spine: string[]; sectionPassageCounts: Record<string, number> };

export function buildProgressShape(book: BookDocument): ProgressShape {
  const sectionPassageCounts: Record<string, number> = {};
  for (const [id, section] of buildSectionsById(book.sections)) {
    sectionPassageCounts[id] = section.passages.length;
  }
  return { spine: book.spine, sectionPassageCounts };
}

/**
 * A 0-1 "how far through this book" fraction, for contexts with no mounted
 * reader (e.g. a library grid) to read live scroll position from — computed
 * from the same saved `Position` the reader itself resumes from instead.
 * Deliberately the same shape as useSectionCarousel's own `scrollPct`
 * (spine index + an intra-section fraction, over the whole spine length),
 * just using passageIndex/passageCount as the intra-section fraction rather
 * than scrollTop/scrollHeight, so the figure stays conceptually consistent
 * with whatever percentage the reader shows once actually open.
 */
export function computeBookProgress(book: ProgressShape, position: Position | undefined): number {
  if (!position || book.spine.length === 0) return 0;
  const spineIndex = book.spine.indexOf(position.sectionId);
  if (spineIndex < 0) return 0;
  const passageCount = book.sectionPassageCounts[position.sectionId] ?? 0;
  const intraFraction = passageCount > 0 ? Math.min(1, Math.max(0, position.passageIndex / passageCount)) : 0;
  return (spineIndex + intraFraction) / book.spine.length;
}
