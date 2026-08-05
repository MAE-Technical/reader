import type { NoteContent } from "@/lib/api/types";

/** Cross-entry UI state one thread shares — which single menu/edit is
 * active at a time, and which single entry the thread's one shared
 * composer currently targets, produced by useThreadInteraction and
 * threaded down to whichever NoteThreadCard/ReplyEntry it concerns.
 *
 * `activeComposerFor: null` means the composer targets the top-level note
 * itself (its default, "root" position) — not that no composer exists.
 * There is exactly one composer instance per thread (see NoteThreadCard);
 * a reply's own "Reply" trigger retargets it via `toggleComposer(id)`
 * rather than mounting a second one, and toggling the same id again (or an
 * outside click — see NoteComposer's own onCancel handling) resets it back
 * to `null`/root instead of dismissing it outright. */
export type ThreadUIState = {
  activeComposerFor: string | null;
  toggleComposer: (id: string) => void;
  activeMenuFor: string | null;
  toggleMenu: (id: string | null) => void;
  editingId: string | null;
  startEdit: (id: string | null) => void;
};

/** The store-backed mutations a note/reply card can trigger, bundled so
 * each card takes one prop instead of four. `reply`'s `parentId` is
 * whichever entry's own Reply button was tapped (root note or a reply) —
 * the store itself resolves that down to the two-tier-flat shape. */
export type ThreadActions = {
  reply: (parentId: string, content: NoteContent) => void;
  saveEdit: (noteId: string, content: NoteContent) => void;
  delete: (noteId: string) => void;
  toggleReaction: (noteId: string) => void;
};
