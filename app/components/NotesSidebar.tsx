"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Mic, Pause, PenLine, Play, Square, Trash2, X, EllipsisVertical } from "lucide-react";
import TimeAgo from "react-timeago-i18n";
import { useLibraryStore, type AnnotationRange } from "@/stores/library-store";
import { computeWaveformBars } from "@/lib/audio/waveform";
import { LiveWaveform, WaveformBars } from "./reader/Waveform";
import Tooltip from "./reader/Tooltip";

// A consistent, theme-independent danger red — matches SelectionMenu.tsx's
// own DANGER_COLOR so "destructive" reads the same across both surfaces.
const DANGER_COLOR = "#f26b6b";

/** Joins each touched passage's own local slice — a highlight/note can
 * span more than one passage, so "the quote" isn't always a single
 * substring of one Passage.text. */
function quoteForRanges(ranges: AnnotationRange[], getPassageText: (passageId: string) => string): string {
  return ranges.map((r) => getPassageText(r.passageId).slice(r.start, r.end)).join(" … ");
}

type Props = {
  bookId: string;
  /** The passage this panel was opened from — one of possibly several the
   * annotation's ranges touch. */
  passageId: string;
  /** Resolves any passage's full plain text by id, so a cross-passage
   * annotation's quote can be assembled from more than one passage. */
  getPassageText: (passageId: string) => string;
  /** An existing annotation (thread) being viewed/added to. */
  annotationId?: string;
  /** A brand-new thread with no annotation yet — one range per passage the
   * just-made selection touched. */
  pendingRanges?: AnnotationRange[];
  /** Editing one specific existing note entry in place — absent, the
   * composer starts empty and appends a new entry instead. */
  editingNoteId?: string;
  panelType?: "side" | "sheet";
  /** Book title (and section, when known) — the closest this app can get to
   * a "Ch. 7, p. 201" citation without per-passage page numbering. */
  citation?: string;
  onClose: () => void;
};

type ComposerMode = "idle" | "recording" | "recorded";

function formatSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Measures a container's width live (ResizeObserver) so the voice-note
 * waveform can render at its true full width — "just like a WhatsApp voice
 * note" — rather than an arbitrary fixed pixel count. A callback ref (not a
 * plain ref object read inside a mount-only effect) because both callers'
 * containers are conditionally rendered (recording/recorded composer state,
 * or a saved voice note's own mount) — a mount-only effect would capture
 * `ref.current === null` from before that DOM node ever existed and never
 * look again, leaving width stuck at 0 forever.
 */
function useMeasuredWidth<T extends HTMLElement>() {
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
function useWaveformBars(blob: Blob | null, barCount = 64): number[] {
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

/** A saved voice note's full-length waveform + play/pause — fetches the
 * blob back from its own blob: URL (valid for this tab's session) since
 * decoding it into bars needs the raw audio data, not just a src. */
function VoiceNoteView({ audioUrl, durationMs }: { audioUrl: string; durationMs: number }) {
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
            barWidth={2.5}
            gap={1}
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

/** The text/voice composer — shared by "add a note to a fresh selection"
 * and "edit an existing note." Flows as the last item inside the panel's
 * single scrollable region, right after the quote and any existing notes —
 * not a separate fixed-height footer row outside that scroll area. That
 * used to be a `flex-none` sibling of the scrollable body, which on iOS
 * Safari made the whole panel balloon past the viewport the moment this
 * textarea took focus (the keyboard's viewport resize fought the two
 * competing flex regions). One scroll container, composer last in reading
 * order, sidesteps that entirely. */
function NoteComposer({
  initialText,
  onCancelToView,
  onSave,
}: {
  initialText: string;
  /** Only present when editing an existing note (steps back to the saved
   * view instead of doing nothing on close). */
  onCancelToView?: () => void;
  onSave: (content: { kind: "text"; text: string } | { kind: "voice"; audioUrl: string; durationMs: number }) => void;
}) {
  const [mode, setMode] = useState<ComposerMode>("idle");
  const [text, setText] = useState(initialText);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDurationMs, setAudioDurationMs] = useState(0);
  const [isPlayingDraft, setIsPlayingDraft] = useState(false);
  const [draftCurrentTime, setDraftCurrentTime] = useState(0);
  const [micError, setMicError] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const [waveRef, waveWidth] = useMeasuredWidth<HTMLDivElement>();
  // State, not a ref: LiveWaveform needs its stream during render (to feed
  // the live meter), and refs can't be read there.
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const recordedBars = useWaveformBars(audioBlob);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordStartRef = useRef(0);
  const draftAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(
    () => () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const startRecording = async () => {
    setMicError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
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

  const canSave = mode === "recorded" ? Boolean(audioUrl) : text.trim().length > 0;
  const hasDraft = mode === "recorded" || text.trim().length > 0;

  const handleSave = () => {
    if (mode === "recorded" && audioUrl) {
      onSave({ kind: "voice", audioUrl, durationMs: audioDurationMs });
    } else if (text.trim()) {
      onSave({ kind: "text", text: text.trim() });
    }
  };

  return (
    <div className="border-t border-[var(--reader-border)] pt-3">
      <div
        className={`rounded-sm p-2.5 flex flex-col gap-2 min-h-16 border ${
          hasDraft || mode === "recording" || isFocused ? "border-brand-300" : "border-[var(--reader-border)]"
        }`}
      >
        {mode === "recording" ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500 flex-none animate-pulse" />
              <span className="text-sm font-semibold tabular-nums text-[var(--reader-text)]">
                {formatSeconds(recordSeconds)}
              </span>
              <span className="text-xs text-[var(--reader-text-muted)]">Recording&hellip;</span>
            </div>
            <div ref={waveRef} className="h-8 w-full">
              {mediaRecorder && waveWidth > 0 && (
                <LiveWaveform
                  stream={mediaRecorder.stream}
                  width={waveWidth}
                  height={32}
                  barWidth={2.5}
                  gap={1}
                  barColor="var(--color-brand-500)"
                />
              )}
            </div>
          </div>
        ) : mode === "recorded" ? (
          <div onClick={toggleDraftPlayback} className="cursor-pointer flex items-center gap-2">
            <span className="w-6.5 h-6.5 rounded-full bg-brand-500 flex items-center justify-center flex-none text-white">
              {isPlayingDraft ? <Pause size={11} /> : <Play size={11} fill="currentColor" stroke="none" />}
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
                  progress={audioDurationMs > 0 ? draftCurrentTime / (audioDurationMs / 1000) : 0}
                />
              )}
            </div>
            <span className="text-xs font-medium text-[var(--reader-text-muted)] flex-none">
              {formatSeconds(audioDurationMs / 1000)}
            </span>
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Add a note…"
            rows={2}
            className="w-full resize-none border-none outline-none bg-transparent text-sm font-sans text-[var(--reader-text)] placeholder:text-[var(--reader-text-muted)]"
          />
        )}

        <div className="flex justify-end items-center gap-1.5">
          {mode === "recorded" ? (
            <button
              onClick={discardRecording}
              title="Discard recording"
              className="w-6.5 h-6.5 rounded-full border-none cursor-pointer flex items-center justify-center flex-none bg-transparent text-[var(--reader-text-muted)]"
            >
              <X size={14} />
            </button>
          ) : mode === "idle" ? (
            <button
              onClick={startRecording}
              title="Record a voice note"
              className="w-6.5 h-6.5 rounded-full border-none cursor-pointer flex items-center justify-center flex-none bg-transparent text-[var(--reader-text-muted)]"
            >
              <Mic size={16} />
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-6.5 h-6.5 rounded-full bg-brand-500 border-none cursor-pointer flex items-center justify-center flex-none text-white"
            >
              <Square size={11} fill="currentColor" />
            </button>
          )}
          {mode !== "recording" && (
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={`w-6.5 h-6.5 rounded-full border-none flex items-center justify-center flex-none text-white ${
                canSave ? "bg-brand-500 cursor-pointer" : "bg-[var(--reader-surface-hover)] cursor-default"
              }`}
            >
              <ArrowRight size={13} />
            </button>
          )}
        </div>
        {micError && (
          <div className="text-[11px] text-[var(--reader-text-muted)]">
            Couldn&rsquo;t access the microphone — check your browser&rsquo;s permission for this site.
          </div>
        )}
        {onCancelToView && (
          <button
            onClick={onCancelToView}
            className="w-fit bg-transparent border-none cursor-pointer text-xs font-medium text-[var(--reader-text-muted)] p-0"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function PanelShell({
  panelType,
  title,
  onDelete,
  onClose,
  children,
}: {
  panelType?: "side" | "sheet";
  title: string;
  onDelete?: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isSheet = panelType ? panelType === "sheet" : isMobile;

  return (
    // pointer-events-none — this box exists only to flex-align the real
    // panel below within Reader.tsx's already-narrow wrapper column; on
    // mobile in particular it's taller than the sheet itself (items-end
    // leaves the empty space above it), and none of that empty space
    // should ever intercept a scroll/tap meant for the book content behind
    // it. pointer-events-auto on the actual panel box below restores it.
    <div
      className={`w-full h-full min-h-dvh box-border relative flex overflow-hidden pointer-events-none ${
        isSheet ? "justify-center items-end" : "justify-end items-stretch"
      }`}
    >
      <div
        className={`max-w-full bg-[var(--reader-surface)] shadow-lg flex flex-col box-border overflow-hidden flex-none pointer-events-auto ${
          isSheet
            ? "w-full h-[82%] max-h-[82%] rounded-t-lg"
            : "w-95 h-full max-h-full border border-[var(--reader-border)]"
        }`}
      >
        {isSheet && (
          <div className="flex justify-center pt-2.5 pb-1 flex-none">
            <div className="w-9 h-1 rounded-full bg-[var(--reader-border)]" />
          </div>
        )}
        <div className="px-5 py-4 border-b border-[var(--reader-border)] flex-none flex items-center justify-between">
          <span className="font-serif font-semibold text-base text-[var(--reader-text)]">{title}</span>
          <div className="flex items-center gap-3.5">
            {onDelete && (
              <Tooltip label="Delete highlight" side="bottom">
                <button
                  onClick={onDelete}
                  className="bg-transparent border-none cursor-pointer text-[var(--reader-text-muted)]"
                >
                  <Trash2 size={15} />
                </button>
              </Tooltip>
            )}
            <Tooltip label="Close" side="bottom" align="end">
              <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-[var(--reader-text-muted)]">
                <X size={16} />
              </button>
            </Tooltip>
          </div>
        </div>
        <div className="om-scroll flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-5 py-4 flex flex-col gap-3.5">
          {children}
        </div>
      </div>
    </div>
  );
}

function Quote({ text, citation }: { text: string; citation?: string }) {
  return (
    <div className="flex gap-2.5">
      <div className="w-0.5 bg-brand-400 rounded-xs flex-none" />
      <div className="min-w-0">
        <p className="font-serif italic text-[13.5px] leading-[1.5] text-[var(--reader-text)] m-0 mb-1">
          &ldquo;{text}&rdquo;
        </p>
        {citation && (
          <div className="text-[10px] font-semibold tracking-wide uppercase text-[var(--reader-text-muted)]">
            {citation}
          </div>
        )}
      </div>
    </div>
  );
}

/** A note entry's Edit/Delete, tucked behind its ellipsis trigger instead of
 * two always-visible buttons — same scrim + absolute-menu pattern as
 * AudioPlayer's SpeedMenu (fixed inset-0 catches the outside click that
 * closes it, the menu itself floats off the trigger's own relative parent). */
function EntryMenu({
  canEdit,
  onEdit,
  onDelete,
  onClose,
}: {
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-19" />
      <div className="absolute right-0 top-[calc(100%+4px)] min-w-28 py-1 rounded-md bg-[var(--reader-surface)] border border-[var(--reader-border)] shadow-lg z-20">
        {canEdit && (
          <button
            onClick={onEdit}
            className="w-full flex items-center gap-2 bg-transparent border-none cursor-pointer py-1.5 px-3 text-xs font-medium text-[var(--reader-text)] text-left"
          >
            <PenLine size={13} />
            Edit
          </button>
        )}
        <button
          onClick={onDelete}
          style={{ color: DANGER_COLOR }}
          className="w-full flex items-center gap-2 bg-transparent border-none cursor-pointer py-1.5 px-3 text-xs font-medium text-left"
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    </>
  );
}

function EditPanel({
  bookId,
  passageId,
  getPassageText,
  annotationId,
  pendingRanges,
  editingNoteId,
  panelType,
  citation,
  onClose,
}: Props) {
  const annotations = useLibraryStore((s) => s.getForPassage(bookId, passageId));
  const sameRanges = useLibraryStore((s) => s.sameRanges);
  const addNote = useLibraryStore((s) => s.addNote);
  const updateNoteEntry = useLibraryStore((s) => s.updateNoteEntry);
  const deleteNoteEntry = useLibraryStore((s) => s.deleteNoteEntry);
  const removeHighlight = useLibraryStore((s) => s.removeHighlight);

  // A brand-new thread has no annotationId yet — after its first note is
  // saved, the store creates one, but this component only has the ranges
  // it asked for, so it re-finds "the annotation it just made" by those
  // same ranges rather than an id it was never given.
  const existing = annotationId
    ? annotations.find((a) => a.id === annotationId)
    : pendingRanges
    ? annotations.find((a) => sameRanges(a.ranges, pendingRanges))
    : undefined;
  const ranges = existing?.ranges ?? pendingRanges ?? [];
  const quoteText = quoteForRanges(ranges, getPassageText);

  // Which thread entry (if any) the bottom composer is editing in place —
  // seeded from a deep-link (the list's own per-entry Edit) but otherwise
  // unset, since opening a highlight/note goes straight to an empty
  // composer that *appends* to the thread rather than overwriting it.
  const [editingId, setEditingId] = useState(editingNoteId);
  const editingEntry = editingId ? existing?.notes.find((n) => n.id === editingId) : undefined;

  // Which entry's Edit/Delete menu is open, if any — one at a time, keyed
  // by note id rather than a boolean per row.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Bumped after every append-save so the composer's key below changes even
  // though editingId stays undefined the whole time — without this, saving
  // one new note left NoteComposer mounted with its just-submitted draft
  // (text uncleared, or a voice recording stuck in its "recorded" review
  // state with no way back to the mic) instead of a blank slate for the
  // thread's next entry.
  const [appendCount, setAppendCount] = useState(0);

  // The header trash icon's own confirmation step — deleting a highlight
  // (and everything in its thread, if any) is destructive and irreversible,
  // so it never fires straight from the icon click; it just reveals this
  // warning in place of the notes/composer, requiring an explicit second
  // tap to actually go through.
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleSave = (content: { kind: "text"; text: string } | { kind: "voice"; audioUrl: string; durationMs: number }) => {
    if (editingEntry) {
      updateNoteEntry(bookId, editingEntry.id, content);
      setEditingId(undefined);
    } else {
      addNote(bookId, ranges, content);
      setAppendCount((n) => n + 1);
    }
  };

  const handleDeleteAnnotation = () => {
    if (!existing) return;
    if (existing.highlightId) removeHighlight(bookId, existing.highlightId);
    for (const note of existing.notes) deleteNoteEntry(bookId, note.id);
    onClose();
  };

  return (
    <PanelShell
      panelType={panelType}
      title="Note"
      onClose={onClose}
      onDelete={existing ? () => setConfirmingDelete(true) : undefined}
    >
      <Quote text={quoteText} citation={citation} />
      {confirmingDelete ? (
        <div className="flex flex-col gap-3 pb-1">
          <p className="text-sm text-[var(--reader-text)] m-0">
            {existing && existing.notes.length > 0
              ? "Delete this highlight and its notes? This can't be undone."
              : "Delete this highlight? This can't be undone."}
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={handleDeleteAnnotation}
              style={{ color: DANGER_COLOR }}
              className="bg-transparent border-none cursor-pointer text-xs font-semibold p-0"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="bg-transparent border-none cursor-pointer text-xs font-semibold text-[var(--reader-text-muted)] p-0"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {existing && existing.notes.length > 0 && (
            <div className="flex flex-col gap-3">
              {existing.notes.map((note) => (
                <div
                  key={note.id}
                  className="flex flex-col gap-1.5 pb-4 border-b border-[var(--reader-border)] last:border-b-0"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {note.content.kind === "text" ? (
                        <p className="text-sm text-[var(--reader-text)] m-0">{note.content.text}</p>
                      ) : (
                        <VoiceNoteView audioUrl={note.content.audioUrl} durationMs={note.content.durationMs} />
                      )}
                    </div>
                    <div className="relative flex-none">
                      <button
                        onClick={() => setOpenMenuId((id) => (id === note.id ? null : note.id))}
                        className="flex items-center bg-transparent border-none cursor-pointer text-[var(--reader-text-muted)] p-0.5"
                      >
                        <EllipsisVertical size={15} />
                      </button>
                      {openMenuId === note.id && (
                        <EntryMenu
                          canEdit={note.content.kind === "text"}
                          onEdit={() => {
                            setEditingId(note.id);
                            setOpenMenuId(null);
                          }}
                          onDelete={() => {
                            deleteNoteEntry(bookId, note.id);
                            if (editingId === note.id) setEditingId(undefined);
                            setOpenMenuId(null);
                          }}
                          onClose={() => setOpenMenuId(null)}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-[var(--reader-text-muted)]">
                    <TimeAgo date={new Date(note.savedAt)} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <NoteComposer
            // Remounts when the composer switches which entry it's editing
            // (or back to composing fresh), and also after every append-save
            // (appendCount) so a just-submitted draft doesn't linger — see
            // appendCount above. NoteComposer only reads `initialText` once,
            // at mount.
            key={editingId ?? `new-${appendCount}`}
            initialText={editingEntry?.content.kind === "text" ? editingEntry.content.text : ""}
            onCancelToView={editingId ? () => setEditingId(undefined) : undefined}
            onSave={handleSave}
          />
        </>
      )}
    </PanelShell>
  );
}

/** Private highlights/notes UI for one annotation — opened from clicking an
 * existing mark's "Add note"/"View thread" action, or from a fresh
 * selection's Note action. */
export default function NotesSidebar(props: Props) {
  return <EditPanel {...props} />;
}
