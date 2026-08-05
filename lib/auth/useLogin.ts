"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useSessionStore, type Session } from "@/stores/session-store";
import { authKeys } from "@/lib/auth/queryKeys";
import type { ReaderProfile } from "@/lib/api/types";

export type LoginInput = { email: string; password: string };

/** `POST /api/auth/login`. Failure is always a generic 401 with no `field`
 * (api-spec.md: can't be used to enumerate registered emails) — the login
 * form renders `mutation.error.message` as a form-level banner, never
 * pointing at one specific input. */
export function useLogin() {
  const queryClient = useQueryClient();
  const setSession = useSessionStore((s) => s.setSession);
  return useMutation<{ reader: ReaderProfile; session: Session }, ApiError, LoginInput>({
    mutationFn: (input) => apiFetch<{ reader: ReaderProfile; session: Session }>("/auth/login", { json: input }),
    onSuccess: ({ reader, session }) => {
      setSession(reader.id, session);
      queryClient.setQueryData(authKeys.me, reader);
    },
  });
}
