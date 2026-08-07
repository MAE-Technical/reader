"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { materialKeys } from "@/lib/materials/queryKeys";
import { communityKeys } from "@/lib/community/queryKeys";
import type { AnnotationRange, Note, NoteContent } from "@/lib/api/types";

/** A write anywhere in one material's notes can change three different
 * cached views of the same underlying rows: this material's own note list
 * (inline markers, the book-wide feed), the book details page's own
 * community-notes tab (every sort variant — see notesFeedPrefix), and every
 * sort of the global home feed (a public top-level note may newly qualify,
 * disqualify, or just reorder). Simplest-correct is invalidate-and-refetch
 * on all three rather than hand-rolled optimistic cache patches, a
 * save/react-then-refetch round trip is a real UX tradeoff against the old
 * instant local write, acceptable for this pass (see plan.md's Phase 6 note
 * on this exact tradeoff). */
function invalidateNoteQueries(queryClient: QueryClient, materialId: string) {
  queryClient.invalidateQueries({ queryKey: materialKeys.notes(materialId) });
  queryClient.invalidateQueries({ queryKey: materialKeys.notesFeedPrefix(materialId) });
  queryClient.invalidateQueries({ queryKey: communityKeys.feedPrefix });
}

export type CreateNoteInput = {
  ranges: AnnotationRange[];
  content: NoteContent;
  parentId?: string;
  visibility?: "public" | "private";
};

/** `POST /api/community/notes` — creates a top-level note or (with
 * `parentId`) a reply; the server resolves `parentId` to the thread's true
 * root and stamps `replyingToId` itself (api-spec.md), so callers never
 * have to enforce the two-tier-flat rule. */
export function useCreateNote(materialId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoteInput) => apiFetch<Note>("/community/notes", { json: { materialId, ...input } }),
    onSuccess: () => invalidateNoteQueries(queryClient, materialId),
  });
}

export function useUpdateNote(materialId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, ...input }: { noteId: string; content?: NoteContent; visibility?: "public" | "private" }) =>
      apiFetch<Note>(`/community/notes/${noteId}`, { method: "PATCH", json: input }),
    onSuccess: () => invalidateNoteQueries(queryClient, materialId),
  });
}

export function useDeleteNote(materialId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => apiFetch<void>(`/community/notes/${noteId}`, { method: "DELETE" }),
    onSuccess: () => invalidateNoteQueries(queryClient, materialId),
  });
}

/** `POST /api/community/notes/{noteId}/reactions` — toggle, not add-only. */
export function useToggleReaction(materialId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) =>
      apiFetch<{ reactedByMe: boolean; reactionCount: number }>(`/community/notes/${noteId}/reactions`, {
        method: "POST",
      }),
    onSuccess: () => invalidateNoteQueries(queryClient, materialId),
  });
}
