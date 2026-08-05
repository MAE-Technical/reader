"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { materialKeys } from "@/lib/materials/queryKeys";
import type { Note, NoteThread } from "@/lib/api/types";

// Fetched once per material at a generous flat limit rather than truly
// paginated — the reader needs every note up front to group by passage for
// inline markers/the book-wide feed, not a paged list. A book with more
// than this many top-level community notes will silently miss the oldest
// ones from inline rendering — an acceptable simplification for this pass
// (same "fetch a generous page, tune later" tradeoff as
// lib/materials/list.ts's survey-picker call), not a hard product limit.
const NOTES_FETCH_LIMIT = 200;

/** `GET /api/materials/{materialId}/notes` — every community note anchored
 * anywhere in this material, flattened (root + replies) rather than nested
 * `NoteThread[]`, since `buildAnnotationsForPassage` groups by shared
 * `ranges` regardless of nesting (see stores/library-store.ts). No auth
 * required — public notes always visible; the caller's own private notes
 * too, once authenticated, resolved server-side from the Bearer token. */
export function useMaterialNotes(materialId: string) {
  const query = useQuery({
    queryKey: materialKeys.notes(materialId),
    queryFn: () =>
      apiFetch<{ items: NoteThread[]; nextCursor: string | null }>(
        `/materials/${materialId}/notes?limit=${NOTES_FETCH_LIMIT}`
      ),
    enabled: Boolean(materialId),
  });
  const notes = useMemo<Note[]>(
    () => (query.data?.items ?? []).flatMap((thread) => [thread.note, ...thread.replies]),
    [query.data]
  );
  return { data: notes, isLoading: query.isLoading, isError: query.isError };
}
