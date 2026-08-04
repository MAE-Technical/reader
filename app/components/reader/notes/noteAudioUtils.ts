import { useCallback, useEffect, useState } from "react";
import { computeWaveformBars } from "@/lib/audio/waveform";

export function formatSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Measures a container's width live (ResizeObserver) so a voice-note
 * waveform can render at its true full width — "just like a WhatsApp voice
 * note" — rather than an arbitrary fixed pixel count. A callback ref (not a
 * plain ref object read inside a mount-only effect) because callers'
 * containers are conditionally rendered — a mount-only effect would capture
 * `ref.current === null` from before that DOM node ever existed and never
 * look again, leaving width stuck at 0 forever. */
export function useMeasuredWidth<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [width, setWidth] = useState(0);
  const ref = useCallback((el: T | null) => setNode(el), []);
  useEffect(() => {
    if (!node) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);
  return [ref, width] as const;
}

/** Decodes a blob into a fixed set of waveform bars once, for a saved/
 * just-recorded clip's full-length static display (not the live meter,
 * which reads the stream directly instead of a finished recording). */
export function useWaveformBars(blob: Blob | null, barCount = 64): number[] {
  const [bars, setBars] = useState<number[]>([]);
  useEffect(() => {
    // A null blob (nothing recorded yet, or just discarded) simply leaves
    // the last computed bars in place — harmless, since callers only ever
    // render them while a blob exists — rather than a synchronous setState
    // right at the top of the effect.
    if (!blob) return;
    let cancelled = false;
    const ctx = new AudioContext();
    blob
      .arrayBuffer()
      .then((buf) => ctx.decodeAudioData(buf))
      .then((audioBuffer) => {
        if (!cancelled) setBars(computeWaveformBars(audioBuffer, barCount));
      })
      .catch(() => {
        if (!cancelled) setBars([]);
      })
      .finally(() => {
        ctx.close().catch(() => {});
      });
    return () => {
      cancelled = true;
    };
  }, [blob, barCount]);
  return bars;
}
