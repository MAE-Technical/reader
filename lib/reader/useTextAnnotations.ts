import { useCallback, useState } from "react";
import { useLibraryStore, type AnnotationRange } from "@/stores/library-store";
import { computeSelectionRanges } from "./annotationSelection";

export type SelectionAnchor = { top: number; bottom: number; left: number; right: number };
export type SelectionState = { ranges: AnnotationRange[]; anchor: SelectionAnchor };

export type NotesPanelState = {
  passageId: string;
  annotationId?: string;
  ranges?: AnnotationRange[];
  /** Set only when editing one specific existing note entry in place
   * (from a per-entry Edit) — absent, the panel composes a fresh note to
   * append to the thread instead of overwriting one. */
  editingNoteId?: string;
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
  const onNoteMarkerClick = useCallback((passageId: string, annotationId: string) => {
    setNotesPanel({ passageId, annotationId });
  }, []);

  const closeNotesPanel = useCallback(() => setNotesPanel(null), []);

  return {
    getForPassage: useCallback((passageId: string) => getForPassage(bookId, passageId), [getForPassage, bookId]),
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
