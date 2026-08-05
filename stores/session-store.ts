import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * What `POST /api/auth/signup`/`/login` hand back alongside the reader's own
 * profile — api-spec.md's Shared Types doesn't name this as its own type,
 * but every route returns exactly this shape under `session`.
 */
export type Session = { accessToken: string; refreshToken: string; expiresAt: string };

export function isSessionValid(session: Session | null): boolean {
  return Boolean(session) && Date.parse(session!.expiresAt) > Date.now();
}

type SessionState = {
  readerId: string | null;
  session: Session | null;
  /** False until this store's real data has actually been pulled from
   * localStorage — same `skipHydration`/manual-rehydrate convention as
   * every other client store here (reader-store, library-store), and for
   * the same reason: reading `session` before rehydration completes would
   * read the default `null` on both the server and the client's first
   * paint, then snap true a moment later once localStorage is actually
   * read — see useIsAuthenticated, the one thing that reads this store's
   * derived auth state everywhere else in the app. Rehydrated once, in
   * QueryProvider (mounted at the root layout), not per-component. */
  hasHydrated: boolean;
  setSession: (readerId: string, session: Session) => void;
  clearSession: () => void;
};

/**
 * Authenticated-reader identity — what actually replaces
 * reader-identity-store's one real job ("remember who I am across a page
 * reload"), just backed by a real account now instead of a minted anonymous
 * uuid. `readerId` here is informational only (e.g. for display); no route
 * handler ever trusts a client-supplied reader id — every write's authorship
 * is resolved server-side from `session.accessToken` alone
 * (`getAuthenticatedReader()`).
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      readerId: null,
      session: null,
      hasHydrated: false,
      setSession: (readerId, session) => set({ readerId, session }),
      clearSession: () => set({ readerId: null, session: null }),
    }),
    {
      name: "ominira-session",
      skipHydration: true,
      onRehydrateStorage: () => () => {
        useSessionStore.setState({ hasHydrated: true });
      },
    }
  )
);
