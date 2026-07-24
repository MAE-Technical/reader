import { create } from "zustand";
import type { Narrator, Section } from "@/lib/book/schema";

type NarratorTrack = NonNullable<Section["audio"]>["narratorTracks"][number];

/**
 * Derived narration state for whichever book is currently playing
 * (audio-store's `book`) — kept separate from audio-store itself since
 * these fields are recomputed continuously as playback advances (spine
 * section, active word) rather than being plain playback controls.
 * Written exclusively by lib/audio/NarrationEngine.tsx, the single
 * component (mounted once in the root layout) that owns the real
 * `<audio>` element; every action here is a placeholder until the engine
 * mounts and replaces it, which happens before anything else in the app
 * can render a control that calls one.
 */
type NarrationState = {
  audioSection: Section | undefined;
  audioSectionTrack: NarratorTrack | undefined;
  narratorOptions: Narrator[];
  /** Which passage — and which word within it — is currently being
   * narrated. currentWordIndex is intentionally unused for styling right
   * now (see BookContent) until audio generation moves off concatenated
   * per-passage chunks, whose cumulative timing drifts too far from real
   * playback for word-accurate highlighting. */
  currentPlayingPassageId: string | undefined;
  currentWordIndex: number | undefined;
  /** Spine index of the section currently narrating, -1 when nothing is
   * playing. Reader compares this against its own carousel activeIndex to
   * decide whether it's "following along". */
  audioIndex: number;
  canSkipToPrevSection: boolean;
  canSkipToNextSection: boolean;

  seekToPassageForListening: (sectionId: string, passageId: string) => void;
  skipToPrevSection: () => void;
  skipToNextSection: () => void;
  handleWordClick: (passageId: string, wordIndex: number) => void;
  handleSeek: (ms: number) => void;
};

export const useNarrationStore = create<NarrationState>(() => ({
  audioSection: undefined,
  audioSectionTrack: undefined,
  narratorOptions: [],
  currentPlayingPassageId: undefined,
  currentWordIndex: undefined,
  audioIndex: -1,
  canSkipToPrevSection: false,
  canSkipToNextSection: false,

  seekToPassageForListening: () => {},
  skipToPrevSection: () => {},
  skipToNextSection: () => {},
  handleWordClick: () => {},
  handleSeek: () => {},
}));
