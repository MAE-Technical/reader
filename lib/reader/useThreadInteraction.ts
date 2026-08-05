import { useState } from "react";
import type { AnnotationRange, Note } from "@/lib/api/types";
import { useCreateNote, useUpdateNote, useDeleteNote, useToggleReaction } from "@/lib/community/useNoteMutations";
import { useRequireAuth } from "./useRequireAuth";
import { topLevelNotes } from "./noteThread";
import type { ThreadActions, ThreadUIState } from "./threadTypes";

/**
 * Everything about how one highlight's thread behaves interactively —
 * which single composer/menu/edit is active (never more than one at a
 * time, across the whole thread), which top-level notes have their
 * replies expanded, and the server-backed mutations bound to this
 * highlight's own `ranges`. Extracted out of NotesSidebar (the per-
 * highlight note panel) so the book-wide feed can give each highlight it
 * lists the exact same interactive thread — reply, edit, delete, react —
 * rather than a second, read-only implementation of the same thing.
 */
export function useThreadInteraction({
  materialId,
  ranges,
  allNotes,
  initialEditingId,
  initialExpandAll,
}: {
  materialId: string;
  ranges: AnnotationRange[];
  allNotes: Note[];
  /** Deep-links straight into editing one specific existing entry, and
   * auto-expands its parent so editing a reply never opens into a
   * collapsed, invisible thread. Only the standalone note panel uses this
   * (a deep-link from elsewhere in the reader) — the feed never does. */
  initialEditingId?: string;
  /** Starts every top-level note's replies expanded rather than collapsed
   * — the home feed's deep link into one specific note sets this, since a
   * reader arriving from a community discussion came for the conversation
   * and shouldn't have to expand every reply by hand to see it. A plain
   * marker click leaves this unset (collapsed default). */
  initialExpandAll?: boolean;
}) {
  const createNote = useCreateNote(materialId);
  const updateNote = useUpdateNote(materialId);
  const deleteNote = useDeleteNote(materialId);
  const toggleReaction = useToggleReaction(materialId);
  const requireAuth = useRequireAuth();

  // Evaluated once at mount, same as editingId below — not a live
  // subscription, since allNotes/initialEditingId are set once per
  // thread instance (a fresh NotesSidebar/FeedHighlightThread mount).
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    if (initialExpandAll) return new Set(topLevelNotes(allNotes).map((n) => n.id));
    const target = initialEditingId ? allNotes.find((n) => n.id === initialEditingId) : undefined;
    return target?.parentId ? new Set([target.parentId]) : new Set();
  });
  // Only one composer/menu is ever open across this thread at a time —
  // opening a new one implicitly closes whatever else was open. Keyed by
  // whichever note/reply id it belongs to.
  const [activeComposerFor, setActiveComposerFor] = useState<string | null>(null);
  const [activeMenuFor, setActiveMenuFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(initialEditingId ?? null);

  const ui: ThreadUIState = {
    activeComposerFor,
    toggleComposer: (id) => setActiveComposerFor((cur) => (cur === id ? null : id)),
    activeMenuFor,
    toggleMenu: (id) => setActiveMenuFor(id),
    editingId,
    startEdit: (id) => setEditingId(id),
  };
  const actions: ThreadActions = {
    reply: (parentId, content) => requireAuth(() => createNote.mutate({ ranges, content, parentId })),
    saveEdit: (noteId, content) => requireAuth(() => updateNote.mutate({ noteId, content })),
    delete: (noteId) => requireAuth(() => deleteNote.mutate(noteId)),
    toggleReaction: (noteId) => requireAuth(() => toggleReaction.mutate(noteId)),
  };

  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return { ui, actions, expandedIds, toggleExpanded };
}
