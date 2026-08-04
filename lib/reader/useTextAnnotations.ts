import { useCallback, useState } from "react";
import { useLibraryStore, type Annotation, type AnnotationRange } from "@/stores/library-store";
import { computeSelectionRanges } from "./annotationSelection";

export type SelectionAnchor = { top: number; bottom: number; left: number; right: number };
export type SelectionState = { ranges: AnnotationRange[]; anchor: SelectionAnchor };

/** The synthetic id `getForPassage` stamps onto the pending-selection
 * overlay below — PassageText (PassageContent.tsx) checks for exactly this
 * id to render its wash without also making it clickable (see there for
 * why a click target is wrong for a row that isn't backed by anything real
 * yet). */
export const PENDING_ANNOTATION_ID = "pending-selection";

export type NotesPanelState = {
  passageId: string;
  annotationId?: string;
  ranges?: AnnotationRange[];
  /** Set only when editing one specific existing note entry in place
   * (from a per-entry Edit) — absent, the panel composes a fresh note to
   * append to the thread instead of overwriting one. */
  editingNoteId?: string;
  /** Every top-level note's replies start expanded rather than collapsed —
   * see onNoteMarkerClick's own comment for when this is set. */
  expandAll?: boolean;
};

/**
 * Everything about highlighting and note-taking on passage text, in one
 * place — capturing a selection (including one that spans several
 * passages), the tooltip's Highlight/Note actions, the notes panel's open/
 * closed state, and routing a click on an existing note straight to it.
 * Reader.tsx calls this once and wires the result into SelectionMenu/
 * NotesSidebar; nothing else in the component tree owns this state.
 *
 * Selecting text is the *only* way to start a highlight or note (per
 * product decision) — there's no separate "add" affordance on unmarked
 * passages, so this hook has no "create from nothing" entry point beyond
 * onTextSelect.
 */
export function useTextAnnotations(bookId: string) {
  const getForPassage = useLibraryStore((s) => s.getForPassage);
  const sameRanges = useLibraryStore((s) => s.sameRanges);
  const addHighlight = useLibraryStore((s) => s.addHighlight);
  const removeHighlight = useLibraryStore((s) => s.removeHighlight);
  const deleteNoteEntry = useLibraryStore((s) => s.deleteNoteEntry);

  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [notesPanel, setNotesPanel] = useState<NotesPanelState | null>(null);

  // Called from the active section's own onMouseUp (not per-passage) so a
  // drag that crosses paragraph boundaries is captured as one selection
  // rather than only reacting to whichever passage the mouse happened to
  // release over.
  const onTextSelect = useCallback((sectionEl: HTMLElement) => {
    const ranges = computeSelectionRanges(sectionEl);
    if (!ranges) {
      // A plain tap (mouseup/touchend that leaves nothing selected) ends
      // whatever selection is currently on screen — the same gesture that
      // opened the pill now closes it. This used to be the job of a
      // full-screen "click outside" catcher in SelectionMenu, but that was
      // a bare `fixed inset-0` div sitting outside the scrollable content
      // tree with no scrollable ancestor of its own, so it silently
      // swallowed every touch-scroll gesture for as long as the pill was
      // open (Safari/iPhone: "selects everything and you can't scroll").
      setSelection(null);
      return;
    }
    const rect = window.getSelection()!.getRangeAt(0).getBoundingClientRect();
    setSelection({ ranges, anchor: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right } });
  }, []);

  const dismissSelection = useCallback(() => setSelection(null), []);

  // Re-selecting an already-highlighted span toggles it off instead of
  // stacking a duplicate — the tooltip's Highlight button is the only
  // affordance for removing a highlight, matching "selection is the only
  // mechanism" (no separate click-to-cancel menu on marked text).
  // existing.highlightId (the underlying Highlight row's own id) is what
  // removeHighlight needs — existing.id is the grouped view's deterministic
  // range-derived key, not a real row id.
  const highlightSelection = useCallback(() => {
    if (!selection) return;
    const { ranges } = selection;
    const existing = getForPassage(bookId, ranges[0].passageId).find((a) => a.highlighted && sameRanges(a.ranges, ranges));
    if (existing?.highlightId) removeHighlight(bookId, existing.highlightId);
    else addHighlight(bookId, ranges);
    setSelection(null);
  }, [selection, bookId, getForPassage, sameRanges, removeHighlight, addHighlight]);

  // Adding a note always inserts a brand-new, independent note row — there
  // is no shared parent object to find-or-create, so a re-selection of an
  // already-noted range and a selection with nothing on it yet both just
  // call addNote with the current ranges (see library-store's addNote).
  // The panel still looks up whatever thread already lives at this exact
  // selection so it has something to *display* above the composer, but
  // that lookup is purely for rendering, not for routing the save.
  const noteFromSelection = useCallback(() => {
    if (!selection) return;
    const { ranges } = selection;
    const existing = getForPassage(bookId, ranges[0].passageId).find((a) => sameRanges(a.ranges, ranges));
    setNotesPanel({ passageId: ranges[0].passageId, annotationId: existing?.id, ranges });
    setSelection(null);
  }, [selection, bookId, getForPassage, sameRanges]);

  // Whatever highlight/note thread already lives at the exact ranges of the
  // *current* selection — purely for deciding whether the selection pill
  // should offer a Delete action at all (undefined = nothing here yet).
  const existingForSelection = selection
    ? getForPassage(bookId, selection.ranges[0].passageId).find((a) => sameRanges(a.ranges, selection.ranges))
    : undefined;

  // Removes everything at this selection in one action — the highlight
  // wash (if any) and every note in its thread (if any) — rather than only
  // the highlight flag the way re-selecting and hitting Highlight again
  // does. Makes deleting a highlight/note discoverable via an explicit icon
  // on the pill instead of relying on that toggle-by-re-selecting behavior.
  const deleteSelection = useCallback(() => {
    if (!selection || !existingForSelection) return;
    if (existingForSelection.highlightId) removeHighlight(bookId, existingForSelection.highlightId);
    for (const note of existingForSelection.notes) deleteNoteEntry(bookId, note.id);
    setSelection(null);
  }, [selection, existingForSelection, bookId, removeHighlight, deleteNoteEntry]);

  // Clicking any existing mark (highlight-only or noted) — opens its thread
  // directly, no intermediate menu. Removing a highlight or deleting a note
  // stays a *selection*-driven action (re-select the marked text, partially
  // or in full, and use the pill's Highlight/Delete — see selection/
  // deleteSelection above), so a plain click has exactly one job: read/add
  // to this span's notes.
  //
  // `expandAll` defaults to false (a reader who taps a marker mid-book
  // usually cares about one specific reply, if any, not the whole thread at
  // once) — Reader.tsx's own deep-link effect passes true, since a reader
  // arriving from the home feed's community discussion came *for* the
  // conversation and shouldn't have to expand every reply by hand to see
  // it. Same "opt-in via the call site, not a second function" reasoning as
  // openNoteMarker's own keepHeaderVisible.
  const onNoteMarkerClick = useCallback(
    (passageId: string, annotationId: string, opts?: { expandAll?: boolean }) => {
      setNotesPanel({ passageId, annotationId, expandAll: opts?.expandAll });
    },
    []
  );

  const closeNotesPanel = useCallback(() => setNotesPanel(null), []);

  // Once the reader taps "Note," the browser collapses its own native
  // selection as ordinary click-handling fallout (no code here does that —
  // it happens before this hook's onClick even runs), so the marked text
  // would otherwise go visually bare for as long as the panel is open on a
  // brand-new thread. Splicing in this synthetic, unsaved-but-highlighted
  // entry keeps the exact same wash a real Highlight would have produced —
  // gone the moment the panel closes, whether or not anything was actually
  // saved, since it's never written to the store. Only for a *fresh*
  // thread (no `annotationId` yet) — one already backed by a real
  // Annotation is already rendering correctly on its own.
  const getForPassageWithPending = useCallback(
    (passageId: string): Annotation[] => {
      const real = getForPassage(bookId, passageId);
      if (!notesPanel || notesPanel.annotationId || !notesPanel.ranges) return real;
      const range = notesPanel.ranges.find((r) => r.passageId === passageId);
      if (!range) return real;
      const pending: Annotation = {
        id: PENDING_ANNOTATION_ID,
        ranges: notesPanel.ranges,
        highlighted: true,
        notes: [],
        savedAt: 0,
      };
      return [...real, pending];
    },
    [getForPassage, bookId, notesPanel]
  );

  return {
    getForPassage: getForPassageWithPending,
    selection,
    notesPanel,
    onTextSelect,
    dismissSelection,
    highlightSelection,
    noteFromSelection,
    hasExistingAnnotation: Boolean(existingForSelection),
    deleteSelection,
    onNoteMarkerClick,
    closeNotesPanel,
  };
}
