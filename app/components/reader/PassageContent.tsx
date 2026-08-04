"use client";

import { memo } from "react";
import { MessageCircle } from "lucide-react";
import type { Mark, Passage } from "@/lib/book/schema";
import type { Annotation } from "@/stores/library-store";
import { PENDING_ANNOTATION_ID } from "@/lib/reader/useTextAnnotations";

export type NoteLookup = { id: string; marker: string; text: string };

type Segment = {
  text: string;
  mark?: Mark;
  wordIndex?: number;
  annotationId?: string;
};
type WordRange = { start: number; end: number };
type LocalAnnotation = {
  id: string;
  start: number;
  end: number;
  highlighted: boolean;
  hasNote: boolean;
  noteCount: number;
  /** True when this passage is the last one touched by the annotation's own
   * ranges[] (selection order) — a multi-passage highlight/note renders its
   * wash in every passage it touches, but the glyph only once, here. */
  isTail: boolean;
};

function computeWordRanges(text: string): WordRange[] {
  const ranges: WordRange[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    ranges.push({ start: m.index, end: m.index + m[0].length });
  }
  return ranges;
}

/** Cuts passage text at the union of every mark, word, and user-annotation
 * boundary, so none of the three ever splits a piece another one needs
 * whole — a highlighted range spanning two marked words still renders as
 * one wrapped span internally made of the right em/strong/word pieces. */
function buildSegments(
  text: string,
  marks: Mark[] | undefined,
  words: WordRange[],
  annotations: LocalAnnotation[]
): Segment[] {
  const cuts = new Set<number>([0, text.length]);
  const sortedMarks = marks ? [...marks].sort((a, b) => a.start - b.start) : [];
  for (const mark of sortedMarks) {
    cuts.add(mark.start);
    cuts.add(mark.end);
  }
  for (const word of words) {
    cuts.add(word.start);
    cuts.add(word.end);
  }
  for (const a of annotations) {
    cuts.add(a.start);
    cuts.add(a.end);
  }
  const points = Array.from(cuts).sort((a, b) => a - b);
  const tokens: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    if (start === end) continue;
    const mark = sortedMarks.find((m) => m.start <= start && end <= m.end);
    const wordIdx = words.findIndex((w) => w.start <= start && end <= w.end);
    const annotation = annotations.find((a) => a.start <= start && end <= a.end);
    tokens.push({
      text: text.slice(start, end),
      mark,
      wordIndex: wordIdx >= 0 ? wordIdx : undefined,
      annotationId: annotation?.id,
    });
  }
  return tokens;
}

// Theme-fitting active-narration-word highlight (reader-issues.md) —
// --reader-active-word-bg/text are per-theme tokens (app/globals.css), so
// this reads correctly in both themes instead of a single hardcoded color.
// Deliberately a cool blue, nowhere near --reader-highlight's marker
// yellow, so "this is just what's playing" is never visually confused
// with "I highlighted this."
const ACTIVE_WORD_STYLE: React.CSSProperties = {
  background: "var(--reader-active-word-bg)",
  color: "var(--reader-active-word-text)",
  borderRadius: 4,
  padding: "1px 2px",
};

function renderLeaf(
  seg: Segment,
  key: number,
  notesById: Map<string, NoteLookup>,
  onNoteClick: (note: NoteLookup, target: HTMLElement) => void,
  activeWordIndex: number | undefined
) {
  const activeStyle =
    seg.wordIndex !== undefined && seg.wordIndex === activeWordIndex ? ACTIVE_WORD_STYLE : undefined;

  if (!seg.mark) return <span key={key} style={activeStyle}>{seg.text}</span>;
  if (seg.mark.kind === "em") return <em key={key} style={activeStyle}>{seg.text}</em>;
  if (seg.mark.kind === "strong") return <strong key={key} style={activeStyle}>{seg.text}</strong>;
  if (seg.mark.kind === "note") {
    const note = seg.mark.noteId ? notesById.get(seg.mark.noteId) : undefined;
    if (!note) return <span key={key} style={activeStyle}>{seg.text}</span>;
    return (
      <button
        key={key}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onNoteClick(note, e.currentTarget);
        }}
        style={{ color: "var(--reader-note-accent)" }}
        className="inline align-super text-[0.7em] leading-none font-semibold px-0.5 bg-transparent border-none cursor-pointer"
      >
        {seg.text}
      </button>
    );
  }
  return <span key={key} style={activeStyle}>{seg.text}</span>;
}

/** The only signal that a marked span has entries attached — a highlight
 * with zero entries gets the wash alone (PassageText below), nothing more.
 * Renders once per annotation (see LocalAnnotation.isTail), immediately
 * after the marked text, never in a margin.
 *
 * A bare line-icon at this size read as illegible noise — a thin multi-path
 * glyph shrunk to ~9px loses its shape entirely. A small solid badge (fill +
 * contrasting icon color, --reader-note-accent-fg) fixes that: the badge's
 * silhouette is what's actually recognizable at a glance, the icon just adds
 * meaning on top of an already-legible shape.
 *
 * Geometry matches the Claude Design mockup exactly (not approximated via
 * Tailwind's spacing scale) — 16px circle for a single entry, widening into
 * a pill (8px radius, 5px horizontal padding, 3px gap before the count) at
 * two or more; `position: relative; top: -1px` is the mockup's own nudge to
 * sit the badge on the text's baseline rather than floating above it the
 * way `vertical-align: super` (a much bigger, superscript-sized shift) did
 * in an earlier pass. */
function NoteGlyph({ count }: { count: number }) {
  const isPill = count > 1;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        top: -1,
        height: 16,
        width: isPill ? undefined : 16,
        padding: isPill ? "0 5px" : undefined,
        gap: isPill ? 3 : undefined,
        marginLeft: 4,
        borderRadius: isPill ? 8 : "50%",
        background: "var(--reader-note-accent)",
        color: "var(--reader-note-accent-fg)",
      }}
      className="select-none"
    >
      <MessageCircle size={9} strokeWidth={2.5} />
      {isPill && (
        <span style={{ fontSize: 10, fontWeight: 600, lineHeight: 1 }} className="font-sans">
          {count}
        </span>
      )}
    </span>
  );
}

type PassageTextProps = {
  passage: Passage;
  notesById: Map<string, NoteLookup>;
  onNoteClick: (note: NoteLookup, target: HTMLElement) => void;
  /** User highlights/notes touching this passage — range-scoped (a reader
   * can mark a single word or a whole sentence, not just the entire
   * passage, and a mark can span into neighboring passages too), rendered
   * as wrapping spans around the underlying mark/word tokens. */
  annotations: Annotation[];
  /** Fired for a plain click (not a fresh drag-selection) landing on any
   * existing mark — highlight-only or noted alike — opening its thread
   * directly. Removing a highlight or deleting a note is a *selection*
   * action instead (re-select the marked text and use the pill), so a
   * click here has exactly one job. */
  onNoteMarkerClick: (annotationId: string) => void;
  /** Word index currently being narrated, for inline audio-sync highlighting
   * in the reading view itself (reader-issues #7) — omit outside listen mode. */
  activeWordIndex?: number;
  /** The one annotation (if any) the reader was just taken to from its own
   * quote card in the annotation feed or a deep link — gets the one-shot
   * .reader-jump-flash treatment instead of the plain steady wash every
   * other mark gets, so a passage with several distinct highlights makes
   * obvious which one this was. Reader.tsx clears it back to null shortly
   * after the animation plays once. */
  justJumpedAnnotationId?: string | null;
};

/** Renders a passage's plain text with its ingested marks (em/strong/
 * footnote) and the reader's own highlights/notes applied — both are
 * additive layers cut into the same underlying plain string, never HTML.
 *
 * Wrapped in memo(): with the whole book mounted at once (reader-issues.md
 * — no notion of pages), tokenization now runs for every passage rather
 * than just the one being narrated or annotated. Reader.tsx passes stable
 * references for `passage`/`annotations` and stable callbacks, so on the
 * ~2.6/s re-renders during playback this skips re-tokenizing every passage
 * that isn't the one actually changing. */
export const PassageText = memo(function PassageText({
  passage,
  notesById,
  onNoteClick,
  annotations,
  onNoteMarkerClick,
  activeWordIndex,
  justJumpedAnnotationId,
}: PassageTextProps) {
  const words = activeWordIndex !== undefined ? computeWordRanges(passage.text) : [];
  // An annotation carries one range per passage it touches — resolve each
  // to its own local [start,end) here, since that's all buildSegments
  // needs to know about for this one passage.
  const localAnnotations: LocalAnnotation[] = [];
  for (const a of annotations) {
    const r = a.ranges.find((r) => r.passageId === passage.id);
    if (r)
      localAnnotations.push({
        id: a.id,
        start: r.start,
        end: r.end,
        highlighted: a.highlighted,
        hasNote: a.notes.length > 0,
        noteCount: a.notes.length,
        isTail: a.ranges[a.ranges.length - 1].passageId === passage.id,
      });
  }
  const segments = buildSegments(passage.text, passage.marks, words, localAnnotations);

  // Group consecutive same-annotation tokens into one wrapper span each —
  // where the highlight background actually gets painted (a range, not the
  // whole passage), and the click target for an existing mark.
  const runs: { annotationId?: string; segs: Segment[] }[] = [];
  for (const seg of segments) {
    const last = runs[runs.length - 1];
    if (last && last.annotationId === seg.annotationId) last.segs.push(seg);
    else runs.push({ annotationId: seg.annotationId, segs: [seg] });
  }

  return (
    <>
      {runs.map((run, i) => {
        const children = run.segs.map((seg, j) => renderLeaf(seg, j, notesById, onNoteClick, activeWordIndex));
        if (!run.annotationId) return <span key={i}>{children}</span>;

        const local = localAnnotations.find((a) => a.id === run.annotationId)!;
        // The pending-selection overlay (see useTextAnnotations) shows the
        // exact same wash a real highlight gets, but it isn't backed by
        // anything real yet — clicking it has nowhere correct to go (the
        // notes panel is already open on this same pending thread), so it
        // never becomes a click target the way an actual highlight/note
        // does.
        const isPending = local.id === PENDING_ANNOTATION_ID;
        const showWash = isPending || local.highlighted || local.hasNote;
        const clickable = !isPending && (local.highlighted || local.hasNote);
        const handleClick = clickable
          ? (e: React.MouseEvent<HTMLSpanElement>) => {
              // Don't hijack a fresh drag-selection that merely happens to
              // end on top of this range.
              const sel = window.getSelection();
              if (sel && !sel.isCollapsed && sel.toString().trim()) return;
              e.stopPropagation();
              onNoteMarkerClick(local.id);
            }
          : undefined;

        return (
          <span
            key={i}
            data-annotation-id={local.id}
            onClick={handleClick}
            className={[clickable ? "cursor-pointer" : "", local.id === justJumpedAnnotationId ? "reader-jump-flash" : ""]
              .filter(Boolean)
              .join(" ")}
            style={
              // A note implies a mark on the text itself, same as an
              // explicit highlight — a reader shouldn't have to also hit
              // Highlight separately just to see where their note is
              // anchored. Whether it also has notes beyond the wash is
              // signalled by the glyph below, never by a second text style.
              showWash
                ? {
                    background: "var(--reader-highlight)",
                    borderRadius: 2,
                    padding: "0 1px",
                  }
                : undefined
            }
          >
            {children}
            {local.isTail && local.noteCount > 0 && <NoteGlyph count={local.noteCount} />}
          </span>
        );
      })}
    </>
  );
});

/** Renders an `image`-type passage: the extracted figure plus its caption,
 * in place of the plain-paragraph fallback (reader-issues #5). */
export function ImagePassageBlock({ passage }: { passage: Passage }) {
  if (!passage.src) return null;
  return (
    <figure className="my-6 mx-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- book-supplied assets, not app images */}
      <img src={passage.src} alt={passage.text} className="max-w-full w-auto h-auto rounded-xs" />
      {passage.caption && (
        <figcaption className="text-xs text-sand-500 mt-2 text-center font-sans leading-snug">
          {passage.caption}
        </figcaption>
      )}
    </figure>
  );
}
