"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Mic, Pause, Play, Square, X } from "lucide-react";
import { LiveWaveform, WaveformBars } from "../Waveform";
import { formatSeconds, useMeasuredWidth, useWaveformBars } from "./noteAudioUtils";
import { useVoiceRecorder } from "./useVoiceRecorder";
import { useUploadVoiceNote } from "@/lib/community/useUploadVoiceNote";
import { useIsAuthenticated } from "@/lib/auth/useIsAuthenticated";

// Caps how tall the textarea will grow to fit a long note before it starts
// scrolling internally instead — a chat-input pattern (Slack/iMessage-style),
// so one very long note can't push the Save/mic row out past the panel's own
// viewport.
const MAX_COMPOSER_TEXTAREA_HEIGHT = 150;

/** The text/voice composer — shared by every composing surface in the
 * thread panel: a brand-new top-level note, a reply to a note or another
 * reply, and editing an existing entry in place. Flows as an item inside
 * the panel's single scrollable region, never a fixed footer outside it —
 * that used to be a `flex-none` sibling of the scrollable body, which on
 * iOS Safari made the whole panel balloon past the viewport the moment
 * this textarea took focus (the keyboard's viewport resize fought the two
 * competing flex regions). One scroll container, composer last in reading
 * order wherever it's mounted, sidesteps that entirely.
 *
 * Starts as a single-line idle pill (see `startCollapsed`) that expands
 * into the full text/voice chrome on focus or on tapping its mic — the
 * same collapsed-by-default shape whether it's the always-present root
 * composer or a reply composer a "Reply" tap just mounted. */
export default function NoteComposer({
  initialText,
  placeholder = "Add a note…",
  startCollapsed = false,
  onCancel,
  excludeRef,
  onSave,
}: {
  initialText: string;
  placeholder?: string;
  /** True for a fresh compose surface (root or reply) — starts as the
   * idle pill. False for editing an existing entry in place, which starts
   * already expanded with `initialText` filled in. */
  startCollapsed?: boolean;
  /** Present for a reply composer (closes/unmounts it) and for editing
   * (steps back to the saved view). Absent for the root composer, whose
   * Cancel instead collapses itself back to the idle pill in place — it's
   * a permanent fixture, never unmounted. */
  onCancel?: () => void;
  /** The trigger (e.g. the "Reply" button) that opened this composer —
   * clicks on it never count as "outside" for the click-outside dismissal
   * below, so tapping that same trigger again to close it goes through
   * its own toggle handler instead of racing with this composer's own
   * dismissal and immediately reopening. */
  excludeRef?: RefObject<HTMLElement | null>;
  onSave: (content: { kind: "text"; text: string } | { kind: "voice"; audioUrl: string; durationMs: number }) => void;
}) {
  const isAuthenticated = useIsAuthenticated();
  const [text, setText] = useState(initialText);
  const [expanded, setExpanded] = useState(!startCollapsed);
  const [isFocused, setIsFocused] = useState(false);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const [waveRef, waveWidth] = useMeasuredWidth<HTMLDivElement>();
  const uploadVoiceNote = useUploadVoiceNote();
  const recorder = useVoiceRecorder();
  const recordedBars = useWaveformBars(recorder.audioBlob);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Grows the textarea to fit its content (up to MAX_COMPOSER_TEXTAREA_HEIGHT,
  // past which it scrolls internally) instead of a fixed-height box, which
  // clipped anything longer than a couple of lines — both while typing and
  // while editing an already-long saved note.
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_COMPOSER_TEXTAREA_HEIGHT)}px`;
  }, []);

  // Re-measures whenever the textarea (re)appears — on mount (so an existing
  // long note starts already expanded, no flash of a clipped single line)
  // and whenever `mode` swings back to "idle" (the textarea unmounts while
  // recording/reviewing a voice draft, so its inline height is lost and
  // needs recomputing once it returns).
  useLayoutEffect(() => {
    resizeTextarea();
  }, [resizeTextarea, recorder.mode]);

  // Expanding from the idle pill (focus, or the pill's own mic button)
  // should land the cursor straight in the textarea, same as tapping into
  // any other chat composer — not leave the reader to find and click it.
  useEffect(() => {
    if (expanded && recorder.mode === "idle") textareaRef.current?.focus();
  }, [expanded, recorder.mode]);

  const canSave =
    recorder.mode === "recorded" ? Boolean(recorder.audioUrl) && !isUploadingVoice : text.trim().length > 0;
  const hasDraft = recorder.mode === "recorded" || text.trim().length > 0;

  const handleSave = async () => {
    if (recorder.mode === "recorded" && recorder.audioBlob) {
      setUploadError(false);
      setIsUploadingVoice(true);
      let audioUrl: string;
      try {
        audioUrl = await uploadVoiceNote.mutateAsync(recorder.audioBlob);
      } catch {
        // Keep the draft intact so a flaky connection never costs the
        // reader their recording — same "fail safe, not destructive"
        // stance as the store's own hasHydrated guard.
        setIsUploadingVoice(false);
        setUploadError(true);
        return;
      }
      setIsUploadingVoice(false);
      onSave({ kind: "voice", audioUrl, durationMs: recorder.audioDurationMs });
    } else if (text.trim()) {
      onSave({ kind: "text", text: text.trim() });
    } else {
      return;
    }
    // Self-resets to a pristine idle pill after every save — this is what
    // lets the root composer stay a permanent fixture with no parent-side
    // remount trick, and is harmless everywhere else too (an editing or
    // reply composer's parent typically unmounts it right after, per its
    // own onSave handler). Uses releaseDraft, not discardRecording — the
    // NoteEntry now points at its own uploaded copy, not this draft's blob
    // URL, but discardRecording revoking that blob URL out from under this
    // same composer's just-finished recorded-review UI mid-reset would
    // still be wrong.
    setText("");
    if (recorder.mode !== "idle") recorder.releaseDraft();
    setExpanded(false);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    if (recorder.mode !== "idle") recorder.discardRecording();
    setText("");
    setExpanded(false);
  };

  const handlePillMic = () => {
    setExpanded(true);
    recorder.startRecording();
  };

  // Clicking anywhere outside this composer reverts it — closes a reply/
  // edit instance back to nothing (via onCancel, same as its own Cancel
  // button) so the root composer reappears, or collapses the root
  // composer itself back to its idle pill. This is what makes clicking
  // "Reply" and then changing your mind actually discoverable — the pill
  // that opens has no Cancel button of its own, only the expanded chrome
  // does. Only fires when there's nothing to lose: typed text, a
  // recording actively in progress, or a completed-but-unsaved take are
  // never discarded by a stray click, only by an explicit Cancel/Discard.
  //
  // A single retargetable composer (NoteThreadCard) is shared by every
  // reply's own "Reply" trigger in its thread — any one of them can be the
  // click that just retargeted this same composer instance, so excludeRef
  // (one specific ref) isn't enough on its own. Every such trigger instead
  // marks itself with `data-note-reply-trigger`, and any click landing on
  // one is never treated as "outside" regardless of which reply it belongs
  // to.
  const hasUnsavedProgress = hasDraft || recorder.mode === "recording";
  useEffect(() => {
    if (hasUnsavedProgress) return;
    const onOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (excludeRef?.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-note-reply-trigger]")) return;
      handleCancel();
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleCancel/onCancel close over stable identity per mount for this component's purposes; re-subscribing on hasUnsavedProgress/excludeRef is sufficient.
  }, [hasUnsavedProgress, excludeRef]);

  // Signed-out readers never reach the actual pill/textarea at all — every
  // mount of this composer (root, reply, or edit) is gated the same way,
  // rather than each call site separately guessing whether to render one.
  // This replaces the old behavior of letting the reader type a whole
  // note only to have the save itself (useRequireAuth, deeper in
  // useThreadInteraction/NotesSidebar) silently redirect them to /auth/login
  // — an abrupt, easy-to-miss context switch away from whatever passage
  // they were just reading. Same "Log in"/"Join us" copy and links as
  // AppSidebar's own signed-out promo card, just without that one's
  // dismiss button: this isn't a promo to dismiss, it's the actual reason
  // there's nothing to compose into right now.
  if (!isAuthenticated) {
    return (
      <div className="rounded-md border border-[var(--reader-border)] bg-[var(--reader-surface)] p-3.5">
        <p className="m-0 mb-2 text-xs font-medium leading-relaxed text-[var(--reader-text-muted)]">
          Only logged in members can post.
        </p>
        <div className="flex gap-4">
          <Link
            href="/auth/login"
            className="text-[13px] font-medium text-[var(--reader-text-muted)] no-underline hover:text-[var(--reader-text)]"
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="text-[13px] font-bold text-[var(--reader-accent)] no-underline hover:opacity-80"
          >
            Join us
          </Link>
        </div>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div ref={containerRef} className="flex items-center gap-2">
        <input
          onFocus={() => setExpanded(true)}
          placeholder={placeholder}
          className="flex-1 rounded-sm border border-[var(--reader-border)] bg-[var(--reader-surface-hover)] px-3.5 py-2 text-[14px] font-medium text-[var(--reader-text)] outline-none placeholder:text-[var(--reader-text-muted)]"
        />
        <button
          onClick={handlePillMic}
          title="Record a voice note"
          className="flex h-8.5 w-8.5 flex-none items-center justify-center rounded-full border-none bg-[var(--reader-surface-hover)] text-[var(--reader-text-muted)] cursor-pointer hover:text-[var(--reader-text)]"
        >
          <Mic size={15} />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`rounded-sm p-3 flex flex-col gap-2.5 border transition-colors ${
        hasDraft || recorder.mode === "recording" || isFocused
          ? "border-brand-300 bg-[var(--reader-surface)]"
          : "border-[var(--reader-border)] bg-[var(--reader-surface-hover)]"
      }`}
    >
      {recorder.mode === "recording" ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500 flex-none animate-pulse" />
            <span className="text-sm font-semibold tabular-nums text-[var(--reader-text)]">
              {formatSeconds(recorder.recordSeconds)}
            </span>
            <span className="text-xs text-[var(--reader-text-muted)]">Recording&hellip;</span>
          </div>
          <div ref={waveRef} className="h-8 w-full">
            {recorder.mediaRecorder && waveWidth > 0 && (
              <LiveWaveform
                stream={recorder.mediaRecorder.stream}
                width={waveWidth}
                height={32}
                barWidth={2.5}
                gap={1}
                barColor="var(--color-brand-500)"
              />
            )}
          </div>
        </div>
      ) : recorder.mode === "recorded" ? (
        <div onClick={recorder.toggleDraftPlayback} className="cursor-pointer flex items-center gap-2">
          <span className="w-6.5 h-6.5 rounded-full bg-brand-500 flex items-center justify-center flex-none text-white">
            {recorder.isPlayingDraft ? <Pause size={11} /> : <Play size={11} fill="currentColor" stroke="none" />}
          </span>
          <div ref={waveRef} className="flex-1 min-w-0 h-8">
            {waveWidth > 0 && (
              <WaveformBars
                bars={recordedBars}
                width={waveWidth}
                height={32}
                barWidth={2.5}
                gap={1}
                barColor="var(--reader-text-subtle)"
                barPlayedColor="var(--color-brand-500)"
                progress={
                  recorder.audioDurationMs > 0 ? recorder.draftCurrentTime / (recorder.audioDurationMs / 1000) : 0
                }
              />
            )}
          </div>
          <span className="text-xs font-medium text-[var(--reader-text-muted)] flex-none">
            {formatSeconds(recorder.audioDurationMs / 1000)}
          </span>
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            resizeTextarea();
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          rows={1}
          className="om-scroll w-full resize-none border-none outline-none bg-transparent text-[14px] font-medium text-[var(--reader-text)] placeholder:text-[var(--reader-text-muted)]"
          style={{ maxHeight: MAX_COMPOSER_TEXTAREA_HEIGHT, overflowY: "auto" }}
        />
      )}

      <div className="flex justify-between items-center gap-1.5">
        <div className="flex items-center">
          {recorder.mode === "recorded" ? (
            <button
              onClick={recorder.discardRecording}
              disabled={isUploadingVoice}
              title="Discard recording"
              className="w-7 h-7 rounded-full border-none cursor-pointer flex items-center justify-center flex-none bg-transparent text-[var(--reader-text-muted)] disabled:cursor-default disabled:opacity-50"
            >
              <X size={15} />
            </button>
          ) : recorder.mode === "idle" ? (
            <button
              onClick={recorder.startRecording}
              title="Record a voice note"
              className="w-7 h-7 rounded-full border-none cursor-pointer flex items-center justify-center flex-none bg-transparent text-[var(--reader-text-muted)] hover:text-[var(--reader-text)] hover:bg-[var(--reader-surface-hover)]"
            >
              <Mic size={16} />
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {recorder.mode === "recording" ? (
            <button
              onClick={recorder.stopRecording}
              className="w-7 h-7 rounded-full bg-brand-500 border-none cursor-pointer flex items-center justify-center flex-none text-white"
            >
              <Square size={11} fill="currentColor" />
            </button>
          ) : (
            <>
              {recorder.mode === "idle" && (
                <button
                  onClick={handleCancel}
                  className="bg-transparent border-none cursor-pointer text-xs font-medium text-[var(--reader-text-muted)] px-1 py-1.5"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!canSave}
                title="Send"
                className={`w-7 h-7 rounded-full border-none flex items-center justify-center flex-none transition-colors ${
                  canSave
                    ? "bg-brand-500 text-white cursor-pointer hover:bg-brand-600"
                    : "bg-[var(--reader-surface-hover)] text-[var(--reader-text-muted)] cursor-default"
                }`}
              >
                {isUploadingVoice ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
              </button>
            </>
          )}
        </div>
      </div>
      {recorder.micError && (
        <div className="text-[11px] text-[var(--reader-text-muted)]">
          Couldn&rsquo;t access the microphone — check your browser&rsquo;s permission for this site.
        </div>
      )}
      {uploadError && (
        <div className="text-[11px] text-[var(--reader-text-muted)]">
          Couldn&rsquo;t save the voice note — check your connection and try again.
        </div>
      )}
    </div>
  );
}
