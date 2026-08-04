import type { NoteEntry } from "@/stores/library-store";

/** The thread's top-level notes — everything replying directly to the
 * highlighted passage itself, not to another note. */
export function topLevelNotes(allNotes: NoteEntry[]): NoteEntry[] {
  return allNotes.filter((n) => !n.parentId);
}

/** One top-level note's own flat reply list, oldest first — the thread
 * stays two-tier flat (see NoteEntry.parentId), so this is every reply
 * that note has, never a further level of nesting. */
export function repliesFor(allNotes: NoteEntry[], noteId: string): NoteEntry[] {
  return allNotes.filter((n) => n.parentId === noteId).sort((a, b) => a.savedAt - b.savedAt);
}

export type NoteSortMode = "top" | "chronological";

/** Sorts a list of top-level notes for display — "top" ranks by this
 * reader's local reaction count (ties keep insertion order, via a stable
 * sort), "chronological" is oldest-first, reading like a conversation
 * transcript from its start. Reply lists are never independently sortable
 * (see repliesFor) — the two-tier cap keeps any one list short enough that
 * it doesn't need to be. */
export function sortNotes(notes: NoteEntry[], mode: NoteSortMode): NoteEntry[] {
  if (mode === "chronological") return [...notes].sort((a, b) => a.savedAt - b.savedAt);
  return [...notes].sort((a, b) => b.reactionCount - a.reactionCount);
}
