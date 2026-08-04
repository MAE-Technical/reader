"use client";

import type { CommunityFeedItem } from "@/lib/home/communityFeed";
import { useThreadInteraction } from "@/lib/reader/useThreadInteraction";
import NoteThreadCard from "@/app/components/reader/notes/NoteThreadCard";
import NoteBookHeader from "./NoteBookHeader";

/** One card on the home feed — a thin wrapper around NoteThreadCard, the
 * same shared component the reader's own book-wide panel and single-note
 * view use. The home feed is the one context where a card is fully
 * self-contained (own book header, own quote) rather than several cards
 * sharing one hoisted quote/header above them — see NoteThreadCard's own
 * doc comment. */
export default function CommunityNoteCard({ item }: { item: CommunityFeedItem }) {
  const { ui, actions, expandedIds, toggleExpanded } = useThreadInteraction({
    bookId: item.bookId,
    ranges: item.ranges,
    allNotes: [item.note, ...item.replies],
  });

  return (
    <div className="rounded-sm border border-[var(--reader-border)] bg-[var(--reader-surface)] p-5">
      <NoteThreadCard
        header={<NoteBookHeader item={item} />}
        quote={item.excerpt}
        note={item.note}
        replies={item.replies}
        expanded={expandedIds.has(item.note.id)}
        onToggleExpand={() => toggleExpanded(item.note.id)}
        ui={ui}
        actions={actions}
      />
    </div>
  );
}
