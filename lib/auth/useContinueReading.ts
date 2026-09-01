"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useIsAuthenticated } from "@/lib/auth/useIsAuthenticated";
import { authKeys } from "@/lib/auth/queryKeys";
import { useReadingPositionStore } from "@/stores/reading-position-store";
import type { MaterialSummary } from "@/lib/api/types";

export type ContinueReadingItem = {
  material: MaterialSummary;
  sectionId: string;
  passageIndex: number;
  audioTimeMs: number | null;
  progressPercent: number;
  updatedAt: string;
};

/** `GET /api/auth/me/continue-reading` — already sorted (`updatedAt` desc)
 * and enriched with each material's summary server-side, so
 * ContinueReadingRail renders straight off this with no extra per-book
 * lookups or local progress computation of its own. Unauthenticated: no
 * `readers` row to read a shelf from yet, so this simply never fires (the
 * rail renders nothing — see plan.md's "State-layer groundwork"). */
export function useContinueReading() {
  const isAuthenticated = useIsAuthenticated();
  const query = useQuery({
    queryKey: authKeys.continueReading,
    queryFn: () => apiFetch<{ items: ContinueReadingItem[] }>("/auth/me/continue-reading").then((r) => r.items),
    enabled: isAuthenticated,
  });

  // Seeds reading-position-store's local mirror (keyed by materialId) the
  // moment this shelf loads, so any reader who opens a book straight from
  // this rail — or from anywhere else that reads that store — resumes from
  // their real cross-device position, not just whatever this browser has
  // seen before. See reading-position-store.ts's own doc comment: remote
  // never overwrites a fresher local write.
  const items = query.data;
  useEffect(() => {
    if (!items) return;
    useReadingPositionStore.getState().hydrateFromRemote(
      items.map((item) => ({
        materialId: item.material.id,
        sectionId: item.sectionId,
        passageIndex: item.passageIndex,
        audioTimeMs: item.audioTimeMs,
        progressPercent: item.progressPercent,
        updatedAt: item.updatedAt,
      }))
    );
  }, [items]);

  return query;
}
