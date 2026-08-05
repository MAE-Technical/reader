"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSessionStore } from "@/stores/session-store";

// One QueryClient per browser tab, instantiated inside useState (not at
// module scope) so it's created exactly once per mount and never recreated
// on re-render — the standard App Router pattern, since a module-scope
// singleton would be shared (and leak query cache) across requests on the
// server.
export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());

  // session-store skips automatic persist hydration (see its own doc
  // comment) so the server and the client's first paint agree — rehydrated
  // once here, at the root, rather than per-component the way every other
  // read-only consumer (useIsAuthenticated) would otherwise have to.
  useEffect(() => {
    useSessionStore.persist.rehydrate();
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
