import type { BookDocument } from "@/lib/book/schema";
import { buildPassageIndex, buildSectionsById } from "@/lib/reader/sections";
import { sectionLabel } from "@/lib/reader/sectionHeading";
import type { AnnotationRange } from "@/lib/api/types";

export type NoteExcerpt = { sectionId: string; label: string; excerpt: string };

/** Resolves a note's `ranges[0]` against the book's own passage/section
 * tree into the quoted excerpt text plus its section/label — the one bit
 * of enrichment every notes-reading endpoint that ships a quote alongside
 * its note needs (the global feed, and the per-material feed for the book
 * details page's own community-notes tab). Falls back to all-empty when the
 * book doc or the range's passage can't be resolved, same as before this
 * was pulled out into its own helper. */
export function resolveExcerpt(book: BookDocument | undefined, ranges: AnnotationRange[]): NoteExcerpt {
  const empty: NoteExcerpt = { sectionId: "", label: "", excerpt: "" };
  if (!book) return empty;
  const range = ranges[0];
  if (!range) return empty;

  const passageEntry = buildPassageIndex(book.sections).get(range.passageId);
  if (!passageEntry) return empty;

  const section = buildSectionsById(book.sections).get(passageEntry.sectionId);
  return {
    sectionId: passageEntry.sectionId,
    label: (section && sectionLabel(section)) ?? "",
    excerpt: passageEntry.passage.text.slice(range.start, range.end),
  };
}
