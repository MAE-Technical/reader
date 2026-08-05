import { useSessionStore } from "@/stores/session-store";
import type { Note } from "@/lib/api/types";

/** Whether the signed-in reader authored this note/reply — drives the
 * per-entry menu's Edit option (own notes only, api-spec.md: PATCH is
 * author-only server-side regardless, this is just the client-side
 * affordance). `false` for every note while signed out, same as the old
 * hardcoded single-local-author version defaulted to "yes, always" for a
 * different reason (there was only ever one possible author) — this one
 * has real, possibly-absent identity to compare against instead. */
export function useIsOwnNote(note: Pick<Note, "author">): boolean {
  const readerId = useSessionStore((s) => s.readerId);
  return readerId !== null && note.author.readerId === readerId;
}
