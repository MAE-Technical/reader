/**
 * The one seam a real session system plugs into later. There's no
 * account/session system yet (stores/reader-identity-store.ts is an
 * anonymous per-device id, not an account) — every caller of this hook
 * should read it instead of hardcoding `false`, so wiring up real auth is a
 * one-place change instead of a grep-and-replace across the app.
 */
export function useIsAuthenticated(): boolean {
  return false;
}
