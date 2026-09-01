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
export type Position = {
  sectionId: string;
  passageIndex: number;
  audioTimeMs?: number;
  /** This device's own clock, stamped every local write (setPosition) —
   * compared against `reader_activities.updated_at` (the server's clock) by
   * hydrateFromRemote below to decide which side actually has the more
   * recent position, rather than blindly trusting whichever one happened
   * to write here first. Absent on anything hydrated before this field
   * existed (an old localStorage entry) — treated as "no timestamp,
   * infinitely stale" wherever it's compared, so a first remote hydrate
   * after upgrading always wins and backfills a real one. */
  updatedAt?: string;
};

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
  setPosition: (materialId: string, position: Omit<Position, "updatedAt">, progressPercent?: number) => void;
  /** Seeds this device's mirror from `GET /api/auth/me/continue-reading` on
   * login/app load — remote wins for any materialId whose own `updatedAt`
   * is newer than this device's local write (or where this device has no
   * local write, or no timestamp on the one it has — see Position's own
   * comment); a materialId this device has written to *more* recently (e.g.
   * scrolling just now, before the remote sync round-tripped, or genuinely
   * ahead of another device that hasn't caught up yet) is left alone rather
   * than being stomped back by a now-stale server read. */
  hydrateFromRemote: (entries: Array<Pick<CurrentReadingEntry, "materialId" | "sectionId" | "passageIndex" | "audioTimeMs" | "progressPercent" | "updatedAt">>) => void;
};

/**
 * Reads this device's last-known position for one material straight out of
 * localStorage, synchronously — deliberately bypassing the store's own
 * `persist.rehydrate()` (async even against synchronous localStorage; see
 * `skipHydration`'s own comment) and the network round trip `hasHydrated`/
 * `serverPositionReady` otherwise gate on.
 *
 * This is what lets the reader mount directly on the *correct* section on
 * first render instead of always starting at the book's first section and
 * jumping a moment later (useResumeScroll's old approach, and the source of
 * both the visible "loads the first section first" flash and a real race:
 * the jump was a `goTo` state update racing a `requestAnimationFrame`
 * `scrollIntoView` against whatever the carousel/DOM had actually committed
 * by then). Reading localStorage directly, before the first paint, has no
 * such race — there's nothing async to wait on.
 *
 * Only ever a same-device optimization: this never sees a fresher position
 * saved from another device (that still needs the real network round trip
 * `GET /continue-reading` makes) — callers that use this for the *initial*
 * render still need to reconcile against the server once it answers, same
 * as before. Best-effort: returns undefined on anything from a disabled/
 * unavailable localStorage (private browsing, SSR) or unparsable JSON,
 * never throws.
 */
export function readLocalPositionSync(materialId: string): Position | undefined {
  try {
    const raw = localStorage.getItem("ominira-reading-position");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { state?: { positions?: Record<string, Position> } };
    return parsed.state?.positions?.[materialId];
  } catch {
    return undefined;
  }
}

export const useReadingPositionStore = create<ReadingPositionState>()(
  persist(
    (set, get) => ({
      positions: {},
      progressPercentByMaterial: {},
      hasHydrated: false,

      getPosition: (materialId) => get().positions[materialId],
      setPosition: (materialId, position, progressPercent) => {
        set((s) => ({
          positions: { ...s.positions, [materialId]: { ...position, updatedAt: new Date().toISOString() } },
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
            const existing = positions[entry.materialId];
            // A local write with no timestamp predates this field and can't
            // be trusted as "fresher" just for existing — and an existing
            // one *with* a timestamp only wins if it's genuinely newer than
            // this row's own `reader_activities.updated_at`. Either way,
            // reader_activities (the row this exact PUT-then-read round trip
            // is meant to keep authoritative) wins on anything but a real
            // local edge.
            if (existing?.updatedAt && existing.updatedAt >= entry.updatedAt) continue;
            positions[entry.materialId] = {
              sectionId: entry.sectionId,
              passageIndex: entry.passageIndex,
              audioTimeMs: entry.audioTimeMs ?? undefined,
              updatedAt: entry.updatedAt,
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
      // this device's localStorage happens not to have yet. Per materialId,
      // whichever side has the newer `updatedAt` wins (same comparison
      // hydrateFromRemote itself makes) — the common case is localStorage
      // resolving first with hydrateFromRemote correcting it once the
      // network call lands, but on the rare reverse ordering this is what
      // stops a stale on-disk position from stomping a just-arrived,
      // genuinely fresher remote one.
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<
          Pick<ReadingPositionState, "positions" | "progressPercentByMaterial">
        > | undefined;
        const positions = { ...currentState.positions };
        const progressPercentByMaterial = { ...currentState.progressPercentByMaterial };
        for (const [materialId, position] of Object.entries(persisted?.positions ?? {})) {
          const existing = positions[materialId];
          // No existing (in-memory) entry at all — the common case, nothing
          // to compare against, the on-disk value just moves in. An
          // existing entry only ever gets here from a hydrateFromRemote
          // race (see above), which always stamps updatedAt — so it only
          // loses to the on-disk value when that value can actually prove
          // itself newer.
          const onDiskIsNewer =
            !existing || (position.updatedAt !== undefined && (!existing.updatedAt || position.updatedAt > existing.updatedAt));
          if (!onDiskIsNewer) continue;
          positions[materialId] = position;
          const pct = persisted?.progressPercentByMaterial?.[materialId];
          if (pct !== undefined) progressPercentByMaterial[materialId] = pct;
        }
        return { ...currentState, positions, progressPercentByMaterial };
      },
      onRehydrateStorage: () => () => {
        useReadingPositionStore.setState({ hasHydrated: true });
      },
    }
  )
);
