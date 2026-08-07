"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

const DEBOUNCE_MS = 400;

/** `GET /api/auth/availability` — debounced so the signup form doesn't fire
 * one request per keystroke while a reader is still typing an email or
 * pseudonym. Only enabled once the field is itself well-formed (caller
 * passes `enabled`); disabled while blank/invalid, since there's nothing
 * useful to check yet. Returns `undefined` (neither known-available nor
 * known-taken) until the debounce settles and the request resolves — the
 * signup form treats that as "not yet confirmed," same as a known conflict,
 * so Continue never advances on an unresolved check. */
export function useCheckAvailability(field: "email" | "pseudonym", value: string, enabled: boolean) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  const query = useQuery({
    queryKey: ["auth", "availability", field, debounced],
    queryFn: () =>
      apiFetch<{ email?: { available: boolean }; pseudonym?: { available: boolean } }>(
        `/auth/availability?${field}=${encodeURIComponent(debounced)}`
      ).then((r) => r[field]!.available),
    enabled: enabled && debounced === value && debounced.trim().length > 0,
    staleTime: 30_000,
  });

  return {
    // Still typing (debounce hasn't settled on the latest value yet) or the
    // request itself is in flight — either way, not a confirmed result.
    isChecking: enabled && (debounced !== value || query.isFetching),
    available: query.data,
  };
}
