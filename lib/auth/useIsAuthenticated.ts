import { useSessionStore, isSessionValid } from "@/stores/session-store";

/**
 * The one seam every write affordance (and every login/signup nudge) reads
 * instead of hardcoding a value — backed by stores/session-store.ts's real
 * `{accessToken, refreshToken, expiresAt}` now, not a hardcoded `false`.
 * `false` until session-store has actually rehydrated from localStorage
 * (`hasHydrated`), same reasoning as every other client store's SSR-
 * hydration-mismatch guard here — a component that read a synchronously-true
 * value on the client's first paint (before rehydration) would render
 * differently than the server did.
 *
 * This is a UX nicety only, never the actual security boundary: each write
 * endpoint's own `getAuthenticatedReader()` 401 is what actually enforces
 * auth, same as it would with or without this client-side check — see
 * plan.md's Phase 6 "State-layer groundwork" note.
 */
export function useIsAuthenticated(): boolean {
  const hasHydrated = useSessionStore((s) => s.hasHydrated);
  const session = useSessionStore((s) => s.session);
  return hasHydrated && isSessionValid(session);
}
