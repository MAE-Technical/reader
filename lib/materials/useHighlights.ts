"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useIsAuthenticated } from "@/lib/auth/useIsAuthenticated";
import { materialKeys } from "@/lib/materials/queryKeys";
import type { Highlight } from "@/lib/api/types";

/** `GET /api/materials/{materialId}/highlights` — the caller's own
 * highlights only (auth required; highlights have no `visibility`, see
 * models-spec.md). Never fires while unauthenticated — there's nothing to
 * read yet. */
export function useHighlights(materialId: string) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: materialKeys.highlights(materialId),
    queryFn: () => apiFetch<{ items: Highlight[] }>(`/materials/${materialId}/highlights`).then((r) => r.items),
    enabled: isAuthenticated && Boolean(materialId),
  });
}
