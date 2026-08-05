import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useSessionStore, isSessionValid } from "@/stores/session-store";
import type { CurrentReadingEntry } from "@/lib/api/types";

/** Resume position within a book. `audioTimeMs` is only meaningful in
 * "listen" mode and only set once a recorded track has actually played;
 * absent it, listen-mode resume falls back to the passage's first word.
 * Moved here from library-store.ts (Phase 6) — this is the one piece of
 * that store's old per-book state that still needs instant, synchronous,
 * network-independent reads/writes on every scroll tick, so it stays its
 * own `persist`-backed store rather than becoming TanStack Query state like
 * highlights/notes did. */
export type Position = { sectionId: string; passageIndex: number; audioTimeMs?: number };

// Debounced per materialId — same cadence library-store's old setPosition
// callers (useReadingProgress's SETTLE_MS, the narration engine) already
// self-throttle at, so this is a second, coarser debounce specifically
// around the network write, not a replacement for those local ones. Module-
// level (not store state) since it's pure bookkeeping for the flush timer,
// never rendered.
const SYNC_DEBOUNCE_MS = 1500;
const pendingSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleRemoteSync(materialId: string) {
  const session = useSessionStore.getState().session;
  if (!isSessionValid(session)) return; // no readers row to write to yet — see plan.md's "State-layer groundwork"

  const existing = pendingSyncTimers.get(materialId);
  if (existing) clearTimeout(existing);
  pendingSyncTimers.set(
    materialId,
    setTimeout(() => {
      pendingSyncTimers.delete(materialId);
      // Reads fresh from the store at flush time, not whatever value was
      // current when this timer was scheduled — a rapid run of scroll
      // events reschedules this same timer repeatedly, so only the last
      // position by the time it actually fires should ever go out.
      const position = useReadingPositionStore.getState().positions[materialId];
      if (!position) return;
      const progressPercent = useReadingPositionStore.getState().progressPercentByMaterial[materialId] ?? 0;
      apiFetch<void>("/auth/me/reading-position", {
        method: "PUT",
        json: {
          materialId,
          sectionId: position.sectionId,
          passageIndex: position.passageIndex,
          audioTimeMs: position.audioTimeMs,
          progressPercent,
        },
      }).catch((err) => {
        // A dropped position sync isn't worth surfacing to the reader —
        // the local mirror (this store) already has it, so nothing is lost
        // on this device; it just won't have followed them anywhere else
        // yet. Logged for visibility, same as other best-effort syncs.
        if (!(err instanceof ApiError)) console.error("reading-position sync failed", err);
      });
    }, SYNC_DEBOUNCE_MS)
  );
}

type ReadingPositionState = {
  positions: Record<string, Position>;
  // 0-100, alongside each materialId's Position — the API's own
  // CurrentReadingEntry carries this too (its continue-reading shelf sorts
  // and displays off it), but computing it requires the book's full spine/
  // section-passage-count shape (lib/reader/progress.ts), which this store
  // has no reason to know about — callers pass it in at write time instead
  // of this store re-deriving it.
  progressPercentByMaterial: Record<string, number>;
  hasHydrated: boolean;

  getPosition: (materialId: string) => Position | undefined;
  /** Local write (instant) + a debounced `PUT /api/auth/me/reading-position`
   * (skipped entirely while unauthenticated — see scheduleRemoteSync). */
  setPosition: (materialId: string, position: Position, progressPercent?: number) => void;
  /** Seeds this device's mirror from `GET /api/auth/me/continue-reading` on
   * login/app load — remote wins for any materialId this device has no
   * fresher local write for; a materialId already tracked locally (e.g. a
   * position saved moments ago, before the remote sync round-tripped) is
   * left alone rather than being stomped back by a now-stale server read. */
  hydrateFromRemote: (entries: Array<Pick<CurrentReadingEntry, "materialId" | "sectionId" | "passageIndex" | "audioTimeMs" | "progressPercent">>) => void;
};

export const useReadingPositionStore = create<ReadingPositionState>()(
  persist(
    (set, get) => ({
      positions: {},
      progressPercentByMaterial: {},
      hasHydrated: false,

      getPosition: (materialId) => get().positions[materialId],
      setPosition: (materialId, position, progressPercent) => {
        set((s) => ({
          positions: { ...s.positions, [materialId]: position },
          progressPercentByMaterial:
            progressPercent === undefined
              ? s.progressPercentByMaterial
              : { ...s.progressPercentByMaterial, [materialId]: progressPercent },
        }));
        scheduleRemoteSync(materialId);
      },
      hydrateFromRemote: (entries) =>
        set((s) => {
          const positions = { ...s.positions };
          const progressPercentByMaterial = { ...s.progressPercentByMaterial };
          for (const entry of entries) {
            if (positions[entry.materialId]) continue; // a fresher local write already exists
            positions[entry.materialId] = {
              sectionId: entry.sectionId,
              passageIndex: entry.passageIndex,
              audioTimeMs: entry.audioTimeMs ?? undefined,
            };
            progressPercentByMaterial[entry.materialId] = entry.progressPercent;
          }
          return { positions, progressPercentByMaterial };
        }),
    }),
    {
      name: "ominira-reading-position",
      // Same SSR-hydration-mismatch reasoning as every other client store
      // here — inline resume-scroll and listen-mode render on first paint,
      // so they can't read localStorage before the server and the client's
      // first render agree. Rehydrated explicitly post-mount, same call
      // site that used to rehydrate library-store's own position slice.
      skipHydration: true,
      // Deep-merges rather than the default shallow "persisted state
      // replaces current state" — hydrateFromRemote (useContinueReading)
      // can populate `positions` in memory *before* this store's own
      // localStorage rehydrate call ever runs (there's no fixed ordering
      // between "the continue-reading API response arrived" and "this
      // store's persist.rehydrate() resolved"), and the default shallow
      // merge would otherwise wipe out any remote-seeded materialId that
      // this device's localStorage happens not to have yet. Real local
      // data still wins per materialId on conflict (spread last) — this
      // device's own last-known position is the more trustworthy source
      // for resuming *on this device*, same principle hydrateFromRemote
      // itself already applies the other way around.
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<
          Pick<ReadingPositionState, "positions" | "progressPercentByMaterial">
        > | undefined;
        return {
          ...currentState,
          positions: { ...currentState.positions, ...persisted?.positions },
          progressPercentByMaterial: { ...currentState.progressPercentByMaterial, ...persisted?.progressPercentByMaterial },
        };
      },
      onRehydrateStorage: () => () => {
        useReadingPositionStore.setState({ hasHydrated: true });
      },
    }
  )
);
