"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { WaveformBars } from "@/app/components/reader/Waveform";
import { formatSeconds, useMeasuredWidth, useWaveformBars } from "./noteAudioUtils";

/** A saved voice note's full-length waveform + play/pause — fetches the
 * blob back from its own src (the durable /voice-notes/ file URL every
 * saved NoteEntry carries, see app/api/voice-notes) since decoding it into
 * bars needs the raw audio data, not just a src. Shared by every context
 * that renders a saved voice note (the reader's own note panel, a book's
 * aggregate notes list, and eventually a community note on the home feed).
 * A still-being-recorded/reviewed draft never reaches this component — that
 * lives inline in NoteComposer against the recorder's own local blob. */
export default function VoiceNoteView({ audioUrl, durationMs }: { audioUrl: string; durationMs: number }) {
  const [containerRef, width] = useMeasuredWidth<HTMLDivElement>();
  const [blob, setBlob] = useState<Blob | null>(null);
  const bars = useWaveformBars(blob);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(audioUrl)
      .then((r) => r.blob())
      .then((b) => {
        if (!cancelled) setBlob(b);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!audioRef.current) {
      const el = new Audio(audioUrl);
      el.addEventListener("timeupdate", () => setCurrentTime(el.currentTime));
      el.addEventListener("ended", () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
      audioRef.current = el;
    }
  }, [audioUrl]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play();
      setIsPlaying(true);
    }
  };

  return (
    <div
      onClick={toggle}
      className="cursor-pointer border border-brand-300 rounded-sm py-2 px-2.5 flex items-center gap-2"
    >
      <span className="w-6.5 h-6.5 rounded-full bg-brand-500 flex items-center justify-center flex-none text-white">
        {isPlaying ? <Pause size={11} /> : <Play size={11} fill="currentColor" stroke="none" />}
      </span>
      <div ref={containerRef} className="flex-1 min-w-0 h-8">
        {width > 0 && (
          <WaveformBars
            bars={bars}
            width={width}
            height={32}
            barWidth={2}
            gap={1.5}
            barColor="var(--reader-text-subtle)"
            barPlayedColor="var(--color-brand-500)"
            progress={durationMs > 0 ? currentTime / (durationMs / 1000) : 0}
          />
        )}
      </div>
      <span className="text-xs font-medium text-[var(--reader-text-muted)] flex-none">
        {formatSeconds(durationMs / 1000)}
      </span>
    </div>
  );
}
