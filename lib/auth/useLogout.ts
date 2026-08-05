"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useSessionStore } from "@/stores/session-store";

/** `POST /api/auth/logout`. Clears local session state (and every cached
 * query — continue-reading, own highlights, etc. all belonged to the
 * now-departed reader) even if the network call itself fails: an already-
 * expired/invalid token 401s here regardless, and there's nothing useful to
 * retry — the reader's actual intent ("stop being signed in on this
 * device") is satisfied by clearing local state alone. */
export function useLogout() {
  const queryClient = useQueryClient();
  const clearSession = useSessionStore((s) => s.clearSession);
  return useMutation({
    mutationFn: () => apiFetch<void>("/auth/logout", { method: "POST" }),
    onSettled: () => {
      clearSession();
      queryClient.clear();
    },
  });
}
