"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useIsAuthenticated } from "@/lib/auth/useIsAuthenticated";
import { authKeys } from "@/lib/auth/queryKeys";

/** `GET /api/auth/me/notes-count` — every note this reader has ever
 * authored (root notes and replies both), for the account page's "Notes"
 * stat tile alongside "Books started". A plain count, not a list — nothing
 * here renders the notes themselves. */
export function useNotesCount() {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: authKeys.notesCount,
    queryFn: () => apiFetch<{ count: number }>("/auth/me/notes-count").then((r) => r.count),
    enabled: isAuthenticated,
  });
}
