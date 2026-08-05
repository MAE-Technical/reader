"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useIsAuthenticated } from "@/lib/auth/useIsAuthenticated";
import { authKeys } from "@/lib/auth/queryKeys";
import type { ReaderProfile } from "@/lib/api/types";

/** `GET /api/auth/me` — the account view's real profile, and also what
 * every mutation below (signup/login/survey/complete-onboarding) seeds
 * straight into this same query's cache on success, so this hook never has
 * to be the one to trigger the very first fetch after auth changes. */
export function useProfile() {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: authKeys.me,
    queryFn: () => apiFetch<{ reader: ReaderProfile }>("/auth/me").then((r) => r.reader),
    enabled: isAuthenticated,
  });
}
