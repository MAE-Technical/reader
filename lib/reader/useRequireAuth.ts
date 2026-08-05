import { useRouter } from "next/navigation";
import { useIsAuthenticated } from "@/lib/auth/useIsAuthenticated";

/**
 * The client-side gate every write affordance (highlight, note, reply,
 * reaction, voice-note save) runs a real action through — reading never
 * requires an account, only writes do (plan.md's Phase 6 "State-layer
 * groundwork"). `!isAuthenticated` sends the reader to log in instead of
 * firing a request that would just 401 server-side. This is a UX nicety
 * only, never the actual security boundary: each write endpoint's own
 * `getAuthenticatedReader()` 401 is what actually enforces auth, same as
 * it would with or without this check.
 */
export function useRequireAuth() {
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();
  return function requireAuth(action: () => void) {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    action();
  };
}
