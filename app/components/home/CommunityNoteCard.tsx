"use client";

import type { CommunityFeedItem } from "@/lib/community/useCommunityFeed";
import { useNoteThread } from "@/lib/community/useNoteThread";
import { useThreadInteraction } from "@/lib/reader/useThreadInteraction";
import NoteThreadCard from "@/app/components/reader/notes/NoteThreadCard";
import NoteBookHeader from "./NoteBookHeader";

/** One card on the home feed — a thin wrapper around NoteThreadCard, the
 * same shared component the reader's own book-wide panel and single-note
 * view use. The home feed is the one context where a card is fully
 * self-contained (own book header, own quote) rather than several cards
 * sharing one hoisted quote/header above them — see NoteThreadCard's own
 * doc comment.
 *
 * `GET /api/community/notes` (the feed itself) only returns a `replyCount`
 * per item, not the replies themselves (api-spec.md) — expanding this card
 * lazily fetches the full thread via `GET /api/community/notes/{noteId}`
 * (useNoteThread), rather than shipping every reply to every note with the
 * feed's initial page load. */
export default function CommunityNoteCard({ item }: { item: CommunityFeedItem }) {
  const { ui, actions, expandedIds, toggleExpanded } = useThreadInteraction({
    materialId: item.material.id,
    ranges: item.note.ranges,
    allNotes: [item.note],
  });
  const expanded = expandedIds.has(item.note.id);
  const { data: thread } = useNoteThread(item.note.id, { enabled: expanded });
  const replies = thread?.replies ?? [];

  return (
    <div className="rounded-sm border border-[var(--reader-border)] bg-[var(--reader-surface)] p-5">
      <NoteThreadCard
        header={<NoteBookHeader item={item} />}
        quote={item.excerpt}
        note={item.note}
        replies={replies}
        expanded={expanded}
        onToggleExpand={() => toggleExpanded(item.note.id)}
        ui={ui}
        actions={actions}
      />
    </div>
  );
}
