"use client";

import type { BookNoteFeedItem } from "@/lib/materials/useBookCommunityNotes";
import { useThreadInteraction } from "@/lib/reader/useThreadInteraction";
import NoteThreadCard from "@/app/components/reader/notes/NoteThreadCard";

/** One card in the book details page's community-notes tab — the same
 * NoteThreadCard the home feed and the in-reader panels all use, just
 * without CommunityNoteCard's own book header (redundant here: the whole
 * tab is already scoped to this one book). `break-inside-avoid-column`
 * pairs with the tab's own `columns-2` desktop layout (BookDetailView) so
 * a card's content never gets split across the column break. Threads start
 * expanded, same "no threshold, show everything" rule the home feed
 * follows — see useBookCommunityNotes' own doc comment on why every reply
 * is already in hand with no separate fetch. */
export default function BookNoteCard({ materialId, item }: { materialId: string; item: BookNoteFeedItem }) {
  const { ui, actions, expandedIds, toggleExpanded } = useThreadInteraction({
    materialId,
    ranges: item.note.ranges,
    allNotes: [item.note, ...item.replies],
    initialExpandAll: true,
  });
  const expanded = expandedIds.has(item.note.id);

  return (
    <div className="mb-5 break-inside-avoid-column rounded-sm border border-[var(--reader-border)] bg-[var(--reader-surface)] p-5">
      <NoteThreadCard
        quote={item.excerpt}
        note={item.note}
        replies={item.replies}
        expanded={expanded}
        onToggleExpand={() => toggleExpanded(item.note.id)}
        ui={ui}
        actions={actions}
      />
    </div>
  );
}
