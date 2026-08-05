"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { generalKeys } from "@/lib/general/queryKeys";
import type { MaterialSummary } from "@/lib/api/types";

/** `GET /api/general/random-books` — the home page's "Top books" rail: a
 * fresh random sample of the published catalog, not ranked by anything.
 * Public — no auth gate, unlike useContinueReading. */
export function useRandomBooks(count = 5) {
  return useQuery({
    queryKey: generalKeys.randomBooks(count),
    queryFn: () =>
      apiFetch<{ items: MaterialSummary[] }>(`/general/random-books?count=${count}`).then((r) => r.items),
  });
}
