"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { authKeys } from "@/lib/auth/queryKeys";
import type { ReaderProfile } from "@/lib/api/types";

/** `POST /api/auth/complete-onboarding` — fired when the reader taps "Enter
 * Ominira" on the welcome screen. Advances `pending_welcome` → `active`;
 * no-ops if already active. No request body. */
export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ reader: ReaderProfile }>("/auth/complete-onboarding", { method: "POST" }),
    onSuccess: ({ reader }) => queryClient.setQueryData(authKeys.me, reader),
  });
}
