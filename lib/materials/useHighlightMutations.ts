"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { materialKeys } from "@/lib/materials/queryKeys";
import { makeTempId } from "@/lib/api/optimisticId";
import { useSessionStore } from "@/stores/session-store";
import type { AnnotationRange, Highlight } from "@/lib/api/types";

/** `POST /api/materials/{materialId}/highlights` — shows the highlight the
 * instant it's tapped rather than waiting on the round trip: `onMutate`
 * writes a temp row straight into the cache PassageContent/useAnnotations
 * already render from, `onError` rolls it back (the caller surfaces the
 * failure inline — see SelectionMenu's `override` slot), and `onSuccess`
 * swaps the temp row for the real one no extra refetch needed, since the
 * POST response is already the authoritative row. */
export function useCreateHighlight(materialId: string) {
  const queryClient = useQueryClient();
  const readerId = useSessionStore((s) => s.readerId);
  return useMutation({
    mutationFn: (ranges: AnnotationRange[]) =>
      apiFetch<Highlight>(`/materials/${materialId}/highlights`, { json: { ranges } }),
    onMutate: async (ranges) => {
      const key = materialKeys.highlights(materialId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Highlight[]>(key);
      const tempId = makeTempId();
      const now = new Date().toISOString();
      const optimistic: Highlight = { id: tempId, materialId, readerId: readerId ?? "", ranges, createdAt: now, updatedAt: now };
      queryClient.setQueryData<Highlight[]>(key, (old = []) => [...old, optimistic]);
      return { previous, tempId };
    },
    onError: (_err, _ranges, context) => {
      if (context) queryClient.setQueryData(materialKeys.highlights(materialId), context.previous);
    },
    onSuccess: (created, _ranges, context) => {
      queryClient.setQueryData<Highlight[]>(materialKeys.highlights(materialId), (old = []) =>
        old.map((h) => (context && h.id === context.tempId ? created : h))
      );
    },
  });
}

/** `DELETE /api/materials/{materialId}/highlights/{highlightId}` — removes
 * the row from the cache immediately; a failure restores it (see
 * useCreateHighlight's doc comment for the same onMutate/onError shape). */
export function useDeleteHighlight(materialId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (highlightId: string) =>
      apiFetch<void>(`/materials/${materialId}/highlights/${highlightId}`, { method: "DELETE" }),
    onMutate: async (highlightId) => {
      const key = materialKeys.highlights(materialId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Highlight[]>(key);
      queryClient.setQueryData<Highlight[]>(key, (old = []) => old.filter((h) => h.id !== highlightId));
      return { previous };
    },
    onError: (_err, _highlightId, context) => {
      if (context) queryClient.setQueryData(materialKeys.highlights(materialId), context.previous);
    },
  });
}
