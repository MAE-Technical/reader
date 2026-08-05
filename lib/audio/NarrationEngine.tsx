"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAudioStore } from "@/stores/audio-store";
import { useReadingPositionStore } from "@/stores/reading-position-store";
import { useNarrationStore } from "@/stores/narration-store";
import { buildSectionsById } from "@/lib/reader/sections";
import { buildProgressShape, computeBookProgress } from "@/lib/reader/progress";
import { activeLineIndex, activeWordIndex, buildKaraokeLines, type KaraokeLine } from "@/lib/audio/karaoke";
import type { Narrator, Section } from "@/lib/book/schema";

const EMPTY_NARRATORS: Narrator[] = [];

/**
 * Owns pre-recorded narration playback for whichever book is currently
 * "now playing" (audio-store's `book`) — mounted exactly once, in the root
 * layout, so it survives navigation between the reader and the library
 * (reader-issues: podcast-style playback must follow the reader across
 * pages, not just across sections of one book). There is no live-TTS
 * fallback: a book with no narrators simply has no listen mode.
 *
 * This renders nothing. It exists purely to own the one real
 * `<audio>` element and push derived state into narration-store, which is
 * what NowPlayingBar and Reader (whichever book they're each showing)
 * actually read. Splitting it this way — rather than a plain hook — is
 * required because only one component may ever construct the `Audio()`
 * instance; a hook called from two places (root player bar + the reader
 * page for the same book) would otherwise create two.
 */
export default function NarrationEngine() {
  const book = useAudioStore((s) => s.book);
  const materialId = useAudioStore((s) => s.materialId);
  const audioPlaying = useAudioStore((s) => s.isPlaying);
  const audioCurrentTimeMs = useAudioStore((s) => s.currentTimeMs);
  const audioSpeed = useAudioStore((s) => s.speed);

  const getPosition = useReadingPositionStore((s) => s.getPosition);
  const setPosition = useReadingPositionStore((s) => s.setPosition);
  const audioSectionId = useReadingPositionStore((s) =>
    materialId ? s.positions[materialId]?.sectionId : undefined
  );

  const sectionsById = useMemo(
    () => (book ? buildSectionsById(book.sections) : new Map<string, Section>()),
    [book]
  );
  const progressShape = useMemo(() => (book ? buildProgressShape(book) : null), [book]);
  // Persisted alongside every position write below so reading-position-
  // store's local mirror (and, once synced, the server's own
  // CurrentReadingEntry.progressPercent) always reflects listen-mode
  // progress too, not just plain reading's own useReadingProgress writes.
  const progressPercentFor = useCallback(
    (position: { sectionId: string; passageIndex: number }) =>
      progressShape ? Math.round(computeBookProgress(progressShape, position) * 100) : 0,
    [progressShape]
  );

  // One narration per book for now (per product decision) — always the
  // book's first narrator, no switching UI.
  const narratorId = book?.narrators[0]?.id;

  const audioSection = book
    ? sectionsById.get(audioSectionId ?? book.spine[0]) ?? sectionsById.get(book.spine[0])
    : undefined;
  const audioIndex = book && audioSection ? book.spine.indexOf(audioSection.id) : -1;
  const narratorOptions = book?.narrators ?? EMPTY_NARRATORS;
  const audioSectionTrack = audioSection?.audio?.narratorTracks.find((t) => t.narratorId === narratorId);
  const usesRecordedAudio = Boolean(audioSectionTrack);

  // The actual <audio> element — created once, client-side only, and
  // controlled imperatively rather than rendered, the same way
  // NotesSidebar's voice-memo playback works.
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioSrcRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const audio = new Audio();
    audioElRef.current = audio;

    // Keeps the play/pause icon in sync with the *real* element instead of
    // only the store — an OS/keyboard media key (or another tab's media
    // session) can pause the element directly, bypassing every action here
    // entirely, and without this the UI would keep showing "playing"
    // forever. Guarded on `audio.ended`: a track finishing on its own also
    // fires a native 'pause' (per the HTML spec's "reaches the end"
    // algorithm sets paused=true before firing it), which must NOT be
    // reported as a user pause — the section-end effect below is about to
    // hand the element a new source and keep going.
    const onPlay = () => useAudioStore.getState().play();
    const onPause = () => {
      if (audio.ended) return;
      useAudioStore.getState().pause();
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audioElRef.current = null;
    };
  }, []);

  // Points the element at the active section's track. Compared against a
  // ref rather than audio.src (which the browser resolves to an absolute
  // URL) so a re-render with the same track never resets playback
  // position. Explicitly resumes playback on the new source when already
  // playing — assigning `.src` always pauses the element, and without this
  // an auto-advance to the next section would otherwise go silent instead
  // of continuing.
  useEffect(() => {
    const audio = audioElRef.current;
    if (!audio) return;
    const src = audioSectionTrack?.src;
    if (src === audioSrcRef.current) return;
    audioSrcRef.current = src;
    audio.src = src ?? "";
    // Assigning `.src` runs the element through the browser's media load
    // algorithm, which resets playbackRate back to 1 in Safari (and can on
    // other engines too) — reapply immediately so a chapter auto-advance or
    // skip doesn't silently drop the reader back to 1x.
    audio.playbackRate = useAudioStore.getState().speed;
    if (src && useAudioStore.getState().isPlaying) audio.play().catch(() => {});
  }, [audioSectionTrack?.src]);

  useEffect(() => {
    if (audioElRef.current) audioElRef.current.playbackRate = audioSpeed;
  }, [audioSpeed]);

  // Belt-and-suspenders: Safari has also been observed silently resetting
  // playbackRate to 1 once a freshly-loaded source actually starts playing,
  // independent of the `.src` assignment above — so the single source of
  // truth for "what speed should this element be at" is always
  // audio-store's `speed`, reasserted at both points the browser is known to
  // clobber it, rather than trusting whatever the element already has.
  useEffect(() => {
    const audio = audioElRef.current;
    if (!audio) return;
    const applyRate = () => {
      audio.playbackRate = useAudioStore.getState().speed;
    };
    audio.addEventListener("loadedmetadata", applyRate);
    audio.addEventListener("playing", applyRate);
    return () => {
      audio.removeEventListener("loadedmetadata", applyRate);
      audio.removeEventListener("playing", applyRate);
    };
  }, []);

  useEffect(() => {
    const audio = audioElRef.current;
    if (!audio || !usesRecordedAudio) return;
    if (audioPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [usesRecordedAudio, audioPlaying]);

  // Keeps the shared playback clock in sync with the real element as it
  // plays. Karaoke line/word position below is derived from that clock,
  // not tracked separately.
  useEffect(() => {
    const audio = audioElRef.current;
    if (!audio || !usesRecordedAudio) return;
    const onTimeUpdate = () => {
      useAudioStore.getState().seekTo(audio.currentTime * 1000);
      // Drives the lock-screen/Control Center scrub bar and elapsed-time
      // display — without it the OS media UI still shows play/pause but no
      // progress, since it has no other way to know where in the track the
      // real element is.
      if (typeof navigator !== "undefined" && "mediaSession" in navigator && audioSectionTrack) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audioSectionTrack.durationMs / 1000,
            playbackRate: audio.playbackRate,
            position: audio.currentTime,
          });
        } catch {
          // Safari throws if position momentarily exceeds duration (e.g.
          // right at track-end, just before the auto-advance effect below
          // swaps in the next source) — harmless to skip that one update.
        }
      }
    };
    audio.addEventListener("timeupdate", onTimeUpdate);
    return () => audio.removeEventListener("timeupdate", onTimeUpdate);
  }, [usesRecordedAudio, audioSectionTrack]);

  // Lock-screen / Control Center / Bluetooth-headset controls — the same
  // surface a podcast app gets, including while the screen is locked or the
  // PWA is backgrounded. iOS Safari only shows any of this once
  // `navigator.mediaSession.metadata` is set on the tab actually driving the
  // real <audio> element, which is always this one (see the module doc
  // comment above on why there's exactly one).
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!book) {
      navigator.mediaSession.metadata = null;
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      // Matches NowPlayingBar's own chapterLabel fallback exactly, so the
      // lock screen and the in-app bar never disagree about what to call
      // the current track.
      title: audioSection?.title ?? book.metadata.title,
      artist: book.metadata.author,
      album: book.metadata.title,
      artwork: [{ src: book.metadata.cover }],
    });
  }, [book, audioSection]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = !book ? "none" : audioPlaying ? "playing" : "paused";
  }, [book, audioPlaying]);

  // Explicit seeks (resume, click-to-play, scrub) need to move the real
  // element, not just the store's cached position.
  const seekAudio = useCallback((ms: number) => {
    const clamped = Math.max(0, ms);
    if (audioElRef.current) audioElRef.current.currentTime = clamped / 1000;
    useAudioStore.getState().seekTo(clamped);
  }, []);

  // Seeks to the resume passage's first word (reader-issues #2) when a
  // book/section/narrator combination with a track is freshly opened.
  useEffect(() => {
    if (!book || !materialId || !usesRecordedAudio || !audioSection) return;
    const stored = getPosition(materialId);
    if (!stored || stored.sectionId !== audioSection.id) return;
    if (stored.audioTimeMs !== undefined) {
      seekAudio(stored.audioTimeMs);
      return;
    }
    const resumePassageId = audioSection.passages[stored.passageIndex]?.id;
    const word = audioSection.audio?.words?.find((w) => w.passageId === resumePassageId);
    if (word) seekAudio(word.startMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id, materialId, usesRecordedAudio, audioSection?.id]);

  // Podcast-style continuous narration: once the active section's track
  // ends, advance to the next spine section. If that section has no track
  // for this narrator, playback simply has nothing to highlight/advance
  // until the reader picks a different section or narrator. Whether the
  // reader's own carousel should also turn the page is Reader's own
  // concern (it watches narration-store's audioIndex) — this effect only
  // ever touches the shared position/audio clock, never any page's DOM.
  useEffect(() => {
    if (!book || !materialId || !usesRecordedAudio || !audioSectionTrack || !audioSection) return;
    if (audioCurrentTimeMs < audioSectionTrack.durationMs) return;
    const idx = book.spine.indexOf(audioSection.id);
    const nextId = book.spine[idx + 1];
    if (!nextId) {
      useAudioStore.getState().pause();
      return;
    }
    setPosition(
      materialId,
      { sectionId: nextId, passageIndex: 0, audioTimeMs: 0 },
      progressPercentFor({ sectionId: nextId, passageIndex: 0 })
    );
    seekAudio(0);
  }, [audioCurrentTimeMs, book, materialId, usesRecordedAudio, audioSectionTrack, audioSection, setPosition, seekAudio, progressPercentFor]);

  const karaokeLines: KaraokeLine[] = useMemo(() => {
    if (!usesRecordedAudio) return [];
    return buildKaraokeLines(audioSection?.audio?.words);
  }, [audioSection, usesRecordedAudio]);

  const karaokeIdx = karaokeLines.length ? activeLineIndex(karaokeLines, audioCurrentTimeMs) : 0;
  const currentKaraokeLine = karaokeLines[karaokeIdx];

  // Which passage — and which word within it — is currently being
  // narrated. currentWordIndex is computed but deliberately unused for
  // styling right now — see BookContent's comment on activeWordIndex.
  const currentPlayingPassageId = book ? currentKaraokeLine?.words[0]?.passageId : undefined;

  const currentPlayingPassageWords =
    usesRecordedAudio && currentPlayingPassageId
      ? (audioSection?.audio?.words ?? []).filter((w) => w.passageId === currentPlayingPassageId)
      : [];

  const currentWordIndex =
    !currentPlayingPassageId || !currentPlayingPassageWords.length
      ? undefined
      : activeWordIndex(
          { text: "", startMs: 0, endMs: 0, words: currentPlayingPassageWords },
          audioCurrentTimeMs
        );

  // Persists resume position as playback advances (reader-issues #2).
  useEffect(() => {
    if (!book || !materialId || !usesRecordedAudio || !currentKaraokeLine || !audioSection) return;
    const passageId = currentKaraokeLine.words[0]?.passageId;
    const passageIndex = audioSection.passages.findIndex((p) => p.id === passageId);
    if (passageIndex >= 0) {
      const position = { sectionId: audioSection.id, passageIndex, audioTimeMs: audioCurrentTimeMs };
      setPosition(materialId, position, progressPercentFor(position));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id, materialId, usesRecordedAudio, currentKaraokeLine, audioSection?.id]);

  // Click-a-passage-to-narrate-from-there — a no-op when the target
  // section has no track for the current narrator.
  const seekToPassageForListening = useCallback(
    (sectionId: string, passageId: string) => {
      if (!book || !materialId) return;
      const targetSection = sectionsById.get(sectionId);
      const targetTrack = targetSection?.audio?.narratorTracks.find((t) => t.narratorId === narratorId);
      if (!targetSection || !targetTrack) return;
      const passageIndex = targetSection.passages.findIndex((p) => p.id === passageId);
      const word = (targetSection.audio?.words ?? []).find((w) => w.passageId === passageId);
      if (passageIndex >= 0) {
        const position = { sectionId, passageIndex, audioTimeMs: word?.startMs ?? 0 };
        setPosition(materialId, position, progressPercentFor(position));
      }
      seekAudio(word?.startMs ?? 0);
      useAudioStore.getState().play();
    },
    [book, materialId, sectionsById, narratorId, setPosition, seekAudio, progressPercentFor]
  );

  // Chapter-skip (player's prev/next-chapter buttons, not the ±15s seek) —
  // jumps narration to the adjacent spine section from its first word. A
  // no-op when that neighbor has no track for the current narrator.
  const sectionHasTrack = useCallback(
    (sectionId: string | undefined) =>
      Boolean(
        sectionId && sectionsById.get(sectionId)?.audio?.narratorTracks.some((t) => t.narratorId === narratorId)
      ),
    [sectionsById, narratorId]
  );
  const canSkipToPrevSection = sectionHasTrack(book?.spine[audioIndex - 1]);
  const canSkipToNextSection = sectionHasTrack(book?.spine[audioIndex + 1]);
  const skipSection = useCallback(
    (direction: -1 | 1) => {
      if (!book || !materialId) return;
      const targetId = book.spine[audioIndex + direction];
      if (!sectionHasTrack(targetId)) return;
      const position = { sectionId: targetId, passageIndex: 0, audioTimeMs: 0 };
      setPosition(materialId, position, progressPercentFor(position));
      seekAudio(0);
      useAudioStore.getState().play();
    },
    [book, materialId, audioIndex, sectionHasTrack, setPosition, seekAudio, progressPercentFor]
  );
  const skipToPrevSection = useCallback(() => skipSection(-1), [skipSection]);
  const skipToNextSection = useCallback(() => skipSection(1), [skipSection]);

  // The other half of Media Session support (metadata/playbackState are set
  // above, near where audioSection/audioPlaying are already in scope) —
  // these are the actual lock-screen/Control Center/headset button
  // handlers, registered here since they need seekAudio/skipToPrevSection/
  // skipToNextSection, all defined above this point.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    ms.setActionHandler("play", () => useAudioStore.getState().play());
    ms.setActionHandler("pause", () => useAudioStore.getState().pause());
    // 15s, matching AudioPlayer's own back15Btn/forward15Btn — not the
    // browser-suggested 10s default — so a lock-screen skip lands on
    // exactly the same offset the in-app buttons use. details.seekOffset
    // (seconds) is only present when the OS itself specifies one.
    ms.setActionHandler("seekbackward", (details) => {
      seekAudio(useAudioStore.getState().currentTimeMs - (details.seekOffset ?? 15) * 1000);
    });
    ms.setActionHandler("seekforward", (details) => {
      seekAudio(useAudioStore.getState().currentTimeMs + (details.seekOffset ?? 15) * 1000);
    });
    ms.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) seekAudio(details.seekTime * 1000);
    });
    // Chapter skip (same as skipPrevBtn/skipNextBtn in AudioPlayer.tsx),
    // not a ±15s nudge.
    ms.setActionHandler("previoustrack", skipToPrevSection);
    ms.setActionHandler("nexttrack", skipToNextSection);

    return () => {
      ms.setActionHandler("play", null);
      ms.setActionHandler("pause", null);
      ms.setActionHandler("seekbackward", null);
      ms.setActionHandler("seekforward", null);
      ms.setActionHandler("seekto", null);
      ms.setActionHandler("previoustrack", null);
      ms.setActionHandler("nexttrack", null);
    };
  }, [seekAudio, skipToPrevSection, skipToNextSection]);

  // Click-a-specific-word-to-narrate-from-there — the word-granularity
  // counterpart above.
  const handleWordClick = useCallback(
    (passageId: string, wordIndex: number) => {
      if (!book || !materialId) return;
      const sectionId = Array.from(sectionsById.values()).find((s) =>
        s.passages.some((p) => p.id === passageId)
      )?.id;
      const targetSection = sectionId ? sectionsById.get(sectionId) : undefined;
      const targetTrack = targetSection?.audio?.narratorTracks.find((t) => t.narratorId === narratorId);
      if (!sectionId || !targetSection || !targetTrack) return;
      const passageIndex = targetSection.passages.findIndex((p) => p.id === passageId);
      if (passageIndex < 0) return;
      const word = (targetSection.audio?.words ?? []).filter((w) => w.passageId === passageId)[wordIndex];
      const position = { sectionId, passageIndex, audioTimeMs: word?.startMs ?? 0 };
      setPosition(materialId, position, progressPercentFor(position));
      if (word) seekAudio(word.startMs);
      useAudioStore.getState().play();
    },
    [book, materialId, sectionsById, narratorId, setPosition, seekAudio, progressPercentFor]
  );

  const handleSeek = useCallback((ms: number) => seekAudio(ms), [seekAudio]);

  useEffect(() => {
    useNarrationStore.setState({
      audioSection,
      audioSectionTrack,
      narratorOptions,
      currentPlayingPassageId,
      currentWordIndex,
      audioIndex,
      canSkipToPrevSection,
      canSkipToNextSection,
    });
  }, [
    audioSection,
    audioSectionTrack,
    narratorOptions,
    currentPlayingPassageId,
    currentWordIndex,
    audioIndex,
    canSkipToPrevSection,
    canSkipToNextSection,
  ]);

  useEffect(() => {
    useNarrationStore.setState({
      seekToPassageForListening,
      skipToPrevSection,
      skipToNextSection,
      handleWordClick,
      handleSeek,
    });
  }, [seekToPassageForListening, skipToPrevSection, skipToNextSection, handleWordClick, handleSeek]);

  return null;
}
