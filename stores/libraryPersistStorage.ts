import type { StateStorage } from "zustand/middleware";

const ENDPOINT = "/api/library-data";
const WRITE_DEBOUNCE_MS = 600;

let pendingValue: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function flush(): void {
  if (pendingValue === null) return;
  const value = pendingValue;
  pendingValue = null;
  fetch(ENDPOINT, { method: "PUT", headers: { "Content-Type": "application/json" }, body: value }).catch((err) => {
    // Local-only "rudimentary" storage — a failed write is logged, not
    // retried or surfaced; the in-memory store (what the UI actually
    // renders from) is unaffected either way.
    console.error("Failed to persist library data", err);
  });
}

/**
 * `StateStorage` (the raw get/set/remove interface `createJSONStorage`
 * wraps, same as the localStorage default it replaces) backed by
 * app/api/library-data instead of window.localStorage. Writes are
 * debounced and coalesced to the latest value so high-frequency mutations
 * (setPosition fires on every scroll tick) don't issue a request per call
 * — the in-memory zustand store already updates synchronously regardless,
 * so only disk durability becomes eventually-consistent.
 */
export const libraryFileStorage: StateStorage = {
  getItem: async () => {
    const res = await fetch(ENDPOINT);
    if (res.status === 204 || !res.ok) return null;
    return await res.text();
  },
  setItem: (_name, value) => {
    pendingValue = value;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      flush();
    }, WRITE_DEBOUNCE_MS);
  },
  removeItem: async () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = null;
    pendingValue = null;
    await fetch(ENDPOINT, { method: "DELETE" });
  },
};
