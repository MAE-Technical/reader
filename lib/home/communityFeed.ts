import type { Annotation, AnnotationRange, NoteEntry } from "@/stores/library-store";
import { topLevelNotes, repliesFor } from "@/lib/reader/noteThread";
import type { CommunityBookMeta } from "./communityBook";

// TEMP(api-migration): a book's actual passage text no longer ships with
// CommunityBookMeta (see its own doc comment — that was the multi-MB-per-
// book payload blowing up /home). Real excerpts belong behind a real
// community-feed API endpoint, which doesn't exist yet — this placeholder
// stands in until it does, so this file has exactly one line to change
// (below) rather than a fetch/cache layer to build now and immediately
// throw away once that endpoint lands.
const DUMMY_EXCERPT_PLACEHOLDER =
  "…the passage this note is attached to — real excerpt text will come from the community feed API once it exists.";

export type CommunityFeedItem = {
  note: NoteEntry;
  bookId: string;
  book: { slug: string; title: string; author: string; cover: string };
  passageId: string;
  sectionId: string;
  /** Chapter/section label only — same reasoning as the per-book feed:
   * this app has no per-passage page numbers anywhere. */
  label: string;
  /** TEMP(api-migration): DUMMY_EXCERPT_PLACEHOLDER above, not the real
   * quoted passage — see that constant's own comment. */
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
      for (const note of topLevelNotes(annotation.notes)) {
        items.push({
          note,
          bookId,
          book: { slug: meta.slug, title: meta.title, author: meta.author, cover: meta.cover },
          passageId,
          sectionId,
          label,
          excerpt: DUMMY_EXCERPT_PLACEHOLDER,
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
