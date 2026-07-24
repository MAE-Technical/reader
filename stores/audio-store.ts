import { create } from "zustand";
import type { BookDocument } from "@/lib/book/schema";

/**
 * Playback state lives outside the Reader component tree on purpose: the
 * product spec requires narration to keep playing across navigation
 * (including back to the library), podcast-style. `book` is the single
 * "now playing" slot — the full document, not just an id/slug, since the
 * global narration engine (lib/audio/NarrationEngine.tsx, mounted once in
 * the root layout) needs spine/sections/audio tracks regardless of which
 * route is currently mounted. Opening a new book always replaces whatever
 * was playing — there's only ever one now-playing slot, same as any other
 * single-player audio app.
 */
type AudioState = {
  isPlaying: boolean;
  currentTimeMs: number;
  narratorId: string;
  speed: number;
  /** Real rendered height of the root-level player bar, in px — Reader
   * reads this to reserve bottom space and to position the "back to
   * narration" nudge, without owning the player's DOM itself anymore. */
  playerHeight: number;
  book: BookDocument | null;

  play: () => void;
  pause: () => void;
  toggle: () => void;
  seekTo: (ms: number) => void;
  setNarratorId: (id: string) => void;
  setSpeed: (speed: number) => void;
  setPlayerHeight: (px: number) => void;
  /** Starts (or switches) listen mode to this book and begins playback —
   * the engine's own resume-position effect immediately reconciles
   * currentTimeMs against whatever was last saved for it. */
  openBook: (book: BookDocument) => void;
  /** Exits listen mode entirely — resume position is left untouched in
   * library-store, so reopening the book later picks up where playback
   * left off instead of restarting. */
  closePlayer: () => void;
};

export const useAudioStore = create<AudioState>((set) => ({
  isPlaying: false,
  currentTimeMs: 0,
  narratorId: "",
  speed: 1,
  playerHeight: 0,
  book: null,

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
  seekTo: (ms) => set({ currentTimeMs: Math.max(0, ms) }),
  // Switching narrator switches timelines entirely (a different recording,
  // or the live TTS engine) — the old currentTimeMs has no meaning on the
  // new one, so reset it rather than leaving playback looking corrupted.
  setNarratorId: (narratorId) => set({ narratorId, currentTimeMs: 0 }),
  setSpeed: (speed) => set({ speed }),
  setPlayerHeight: (playerHeight) => set({ playerHeight }),
  openBook: (book) => set({ book, currentTimeMs: 0, isPlaying: true }),
  closePlayer: () => set({ book: null, isPlaying: false }),
}));
