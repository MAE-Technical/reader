import type { AnnotationRange } from "@/stores/library-store";

/**
 * Turns the current window selection into one AnnotationRange per passage
 * it touches, in reading order — a single drag can span several
 * paragraphs, and each one gets its own local [start,end) offset into its
 * own Passage.text (the standard "count characters up to the boundary"
 * technique, per-passage). The caller groups the result under one shared
 * Annotation, so editing/deleting a cross-passage highlight or note treats
 * the whole span as a single unit.
 *
 * Returns null for a collapsed/empty selection, or one that doesn't
 * actually touch any real (non-image) passage under `sectionEl`.
 */
export function computeSelectionRanges(sectionEl: HTMLElement): AnnotationRange[] | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !sel.toString().trim()) return null;
  const range = sel.getRangeAt(0);

  const passageEls = Array.from(
    sectionEl.querySelectorAll<HTMLElement>("[data-passage-id][data-passage-type]")
  ).filter((el) => el.dataset.passageType !== "image");

  const ranges: AnnotationRange[] = [];
  for (const el of passageEls) {
    // Range.intersectsNode() is not a reliable "does this passage actually
    // contain any selected characters" check — per its spec algorithm, a
    // node merely *adjacent* to a selection boundary (its end touching the
    // selection's start, or vice versa, with zero of its own text actually
    // selected) can still report true. That false positive, combined with
    // the "selection started/ended in an earlier/later passage" fallback
    // below (start=0 / end=fullLen), is what made a cross-passage highlight
    // spill into the untouched previous passage, and could just as easily
    // shift where the *first* character of a same-passage selection landed.
    // compareBoundaryPoints against the passage's own full-content range is
    // an exact, boundary-precise overlap test instead — two ranges A and B
    // overlap iff A.start < B.end AND B.start < A.end. Per the DOM spec,
    // compareBoundaryPoints(how, source) is NOT named the intuitive way:
    // END_TO_START compares *this* range's start to *source*'s end (not
    // START_TO_END, which instead compares this's end to source's start) —
    // easy to get backwards, so spelled out here rather than left implicit.
    const elRange = document.createRange();
    elRange.selectNodeContents(el);
    const selectionStartsBeforeElEnds = range.compareBoundaryPoints(Range.END_TO_START, elRange) < 0;
    const elStartsBeforeSelectionEnds = elRange.compareBoundaryPoints(Range.END_TO_START, range) < 0;
    if (!selectionStartsBeforeElEnds || !elStartsBeforeSelectionEnds) continue;

    const passageId = el.dataset.passageId!;
    const fullLen = el.textContent?.length ?? 0;

    let start: number;
    if (el.contains(range.startContainer)) {
      const pre = document.createRange();
      pre.selectNodeContents(el);
      pre.setEnd(range.startContainer, range.startOffset);
      start = pre.toString().length;
    } else {
      // The selection began in an earlier passage — this one is covered
      // from its own start.
      start = 0;
    }

    let end: number;
    if (el.contains(range.endContainer)) {
      const pre = document.createRange();
      pre.selectNodeContents(el);
      pre.setEnd(range.endContainer, range.endOffset);
      end = pre.toString().length;
    } else {
      // The selection continues past this passage into a later one.
      end = fullLen;
    }

    if (end > start) ranges.push({ passageId, start, end });
  }

  return ranges.length ? ranges : null;
}
