"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { communityKeys } from "@/lib/community/queryKeys";
import type { MaterialSummary, Note } from "@/lib/api/types";

export type NoteThreadDetail = {
  note: Note;
  replies: Note[];
  material: Pick<MaterialSummary, "id" | "slug" | "title" | "author" | "cover">;
};

/** `GET /api/community/notes/{noteId}` — one full thread (note + its
 * replies). The home feed's own `GET /api/community/notes` only returns a
 * `replyCount` per item, not the replies themselves (api-spec.md) — this is
 * what a card fetches lazily once actually expanded, and what a standalone
 * "view this thread" deep link would load too. */
export function useNoteThread(noteId: string, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: communityKeys.thread(noteId),
    queryFn: () => apiFetch<NoteThreadDetail>(`/community/notes/${noteId}`),
    enabled: (opts.enabled ?? true) && Boolean(noteId),
  });
}
