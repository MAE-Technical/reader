import type { Annotation, AnnotationRange, NoteEntry } from "@/stores/library-store";
import { quoteForRanges } from "@/lib/reader/annotationSelection";
import { topLevelNotes, repliesFor } from "@/lib/reader/noteThread";
import type { CommunityBookMeta } from "./communityBook";

export type CommunityFeedItem = {
  note: NoteEntry;
  bookId: string;
  book: { slug: string; title: string; author: string; cover: string };
  passageId: string;
  sectionId: string;
  /** Chapter/section label only — same reasoning as the per-book feed:
   * this app has no per-passage page numbers anywhere. */
  label: string;
  /** The highlighted passage's own text — computed with the exact same
   * quoteForRanges the reader itself uses, against the book's shipped
   * passageText map, so it's always correct regardless of when the note
   * was created. */
  excerpt: string;
  annotationId: string;
  /** The annotation's own ranges — needed so a home-feed card can add a
   * reply (`addNote(bookId, ranges, content, parentId)`) without a second
   * lookup back into the store. */
  ranges: AnnotationRange[];
  /** This note's own flat reply list, chronological — not just a count, so
   * the home feed can render them threaded the same as everywhere else. */
  replies: NoteEntry[];
};

/** One card per top-level note (not per highlighted passage) — a passage
 * with two separate notes on it is two cards, matching the design's own
 * data model. Voice or text, either renders via the note's own content. */
export function buildCommunityFeedItems(
  annotationsByBook: Record<string, Annotation[]>,
  booksMeta: Record<string, CommunityBookMeta>
): CommunityFeedItem[] {
  const items: CommunityFeedItem[] = [];
  for (const [bookId, annotations] of Object.entries(annotationsByBook)) {
    const meta = booksMeta[bookId];
    if (!meta) continue;
    for (const annotation of annotations) {
      const passageId = annotation.ranges[0].passageId;
      const sectionId = meta.sectionOfPassage[passageId];
      if (!sectionId) continue;
      const label = meta.sectionLabels[sectionId] ?? "";
      const excerpt = quoteForRanges(annotation.ranges, (id) => meta.passageText[id] ?? "");
      for (const note of topLevelNotes(annotation.notes)) {
        items.push({
          note,
          bookId,
          book: { slug: meta.slug, title: meta.title, author: meta.author, cover: meta.cover },
          passageId,
          sectionId,
          label,
          excerpt,
          annotationId: annotation.id,
          ranges: annotation.ranges,
          replies: repliesFor(annotation.notes, note.id),
        });
      }
    }
  }
  return items;
}

export type CommunityFeedSortMode = "top" | "recent";

export function sortCommunityFeedItems(items: CommunityFeedItem[], mode: CommunityFeedSortMode): CommunityFeedItem[] {
  if (mode === "top") return [...items].sort((a, b) => b.note.reactionCount - a.note.reactionCount);
  return [...items].sort((a, b) => b.note.savedAt - a.note.savedAt);
}
