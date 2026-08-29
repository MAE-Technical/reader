"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { generalKeys } from "@/lib/general/queryKeys";
import type { FeaturedBook } from "@/lib/featured/config";

/** `GET /api/general/featured-books` — the home page's "Featured this
 * week" rail: config/featured.json's hand-curated picks, resolved against
 * the real catalog. Public — no auth gate, unlike useContinueReading. */
export function useFeaturedBooks() {
  return useQuery({
    queryKey: generalKeys.featuredBooks(),
    queryFn: () => apiFetch<{ items: FeaturedBook[] }>("/general/featured-books").then((r) => r.items),
  });
}
