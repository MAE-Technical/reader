"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { materialKeys } from "@/lib/materials/queryKeys";
import type { AnnotationRange, Highlight } from "@/lib/api/types";

/** `POST /api/materials/{materialId}/highlights`. */
export function useCreateHighlight(materialId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ranges: AnnotationRange[]) =>
      apiFetch<Highlight>(`/materials/${materialId}/highlights`, { json: { ranges } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: materialKeys.highlights(materialId) }),
  });
}

/** `DELETE /api/materials/{materialId}/highlights/{highlightId}`. */
export function useDeleteHighlight(materialId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (highlightId: string) =>
      apiFetch<void>(`/materials/${materialId}/highlights/${highlightId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: materialKeys.highlights(materialId) }),
  });
}
