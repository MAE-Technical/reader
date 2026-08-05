import { useEffect, useRef, useState } from "react";

export type VoiceRecorderMode = "idle" | "recording" | "recorded";

/**
 * Owns the whole record → review → discard/play lifecycle for a voice note
 * draft — mic capture, the running timer, the finished blob/URL, and
 * playback of that draft before it's saved. Shared shape used by
 * NoteComposer (and anywhere else that ever needs "record a voice note").
 */
export function useVoiceRecorder() {
  const [mode, setMode] = useState<VoiceRecorderMode>("idle");
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDurationMs, setAudioDurationMs] = useState(0);
  const [isPlayingDraft, setIsPlayingDraft] = useState(false);
  const [draftCurrentTime, setDraftCurrentTime] = useState(0);
  const [micError, setMicError] = useState(false);

  // State, not a ref: LiveWaveform needs its stream during render (to feed
  // the live meter), and refs can't be read there.
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordStartRef = useRef(0);
  const draftAudioRef = useRef<HTMLAudioElement | null>(null);
  // Kept alive across recordings, not re-requested each time — see
  // startRecording's own comment on why.
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(
    () => () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      // The one place the mic actually gets released — composer unmount,
      // not "recording stopped." Safari (particularly iOS/PWA) treats a
      // stream whose every track has been stopped as needing a brand-new
      // permission grant on the next getUserMedia call, even mid-session
      // with the site-level permission still "Allow" — that's what used to
      // reprompt on every single recording, since the old code stopped the
      // stream's tracks as soon as each recording did. Leaving the stream
      // open in between and only tearing it down here (component going
      // away for good) is what lets every recording after the first reuse
      // the same already-granted stream with no further prompt.
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const startRecording = async () => {
    setMicError(false);
    try {
      let stream = streamRef.current;
      if (!stream || stream.getAudioTracks().some((t) => t.readyState === "ended")) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setAudioDurationMs(Date.now() - recordStartRef.current);
        setMode("recorded");
      };
      setMediaRecorder(recorder);
      recordStartRef.current = Date.now();
      recorder.start();
      setMode("recording");
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      // Mic access denied, unavailable, or blocked by permissions policy —
      // stay put rather than silently losing the reader's intent to record.
      setMicError(true);
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    mediaRecorder?.stop();
  };

  const discardRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    draftAudioRef.current = null;
    setIsPlayingDraft(false);
    setDraftCurrentTime(0);
    setMode("idle");
  };

  // Same reset as discardRecording but does NOT revoke the blob URL — for
  // when a draft has just been saved (e.g. into a NoteEntry) rather than
  // thrown away, so whatever now renders that saved entry from the same
  // URL (VoiceNoteView) doesn't get a revoked src out from under it.
  const releaseDraft = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    draftAudioRef.current = null;
    setIsPlayingDraft(false);
    setDraftCurrentTime(0);
    setMode("idle");
  };

  const toggleDraftPlayback = () => {
    if (!audioUrl) return;
    if (!draftAudioRef.current) {
      const el = new Audio(audioUrl);
      el.addEventListener("timeupdate", () => setDraftCurrentTime(el.currentTime));
      el.addEventListener("ended", () => {
        setIsPlayingDraft(false);
        setDraftCurrentTime(0);
      });
      draftAudioRef.current = el;
    }
    if (isPlayingDraft) {
      draftAudioRef.current.pause();
      setIsPlayingDraft(false);
    } else {
      draftAudioRef.current.currentTime = 0;
      draftAudioRef.current.play();
      setIsPlayingDraft(true);
    }
  };

  return {
    mode,
    recordSeconds,
    audioUrl,
    audioBlob,
    audioDurationMs,
    isPlayingDraft,
    draftCurrentTime,
    micError,
    mediaRecorder,
    startRecording,
    stopRecording,
    discardRecording,
    releaseDraft,
    toggleDraftPlayback,
  };
}
