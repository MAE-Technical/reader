import type { Annotation } from "@/stores/library-store";
import type { Passage, Section } from "@/lib/book/schema";
import { sectionLabel } from "./sectionHeading";

export type FeedEntry = {
  annotation: Annotation;
  sectionId: string;
  /** The annotation's own first range's passage — the "jump to" target;
   * a multi-passage annotation is anchored at wherever it starts, same as
   * how its quote/citation is already built elsewhere. */
  passageId: string;
  /** Chapter/section label only — this app has no per-passage page
   * numbers anywhere, so there is no "p. 12" to show alongside it. */
  label: string;
};

export type FeedSectionGroup = {
  sectionId: string;
  label: string;
  entries: FeedEntry[];
};

/** The book-wide annotation feed's view-model: every Annotation the reader
 * has marked — a bare highlight and a full note thread alike, so the feed
 * reads as "everything I marked in this book," not just the subset that
 * happens to have a note on it — grouped by the section it lives in, in
 * book reading order — section order (the spine), then passage order
 * within a section, then range start as a tiebreaker for more than one
 * annotation on the same passage. */
export function buildAnnotationFeedGroups(
  annotations: Annotation[],
  orderedSections: Section[],
  sectionOf: Map<string, string>,
  byId: Map<string, Passage>
): FeedSectionGroup[] {
  const sectionIndex = new Map(orderedSections.map((s, i) => [s.id, i]));

  const entries: FeedEntry[] = [];
  for (const annotation of annotations) {
    if (!annotation.highlighted && annotation.notes.length === 0) continue;
    const range = annotation.ranges[0];
    const sectionId = sectionOf.get(range.passageId);
    const passage = byId.get(range.passageId);
    const section = sectionId ? orderedSections[sectionIndex.get(sectionId) ?? -1] : undefined;
    if (!sectionId || !passage || !section) continue;
    entries.push({ annotation, sectionId, passageId: range.passageId, label: sectionLabel(section) ?? "" });
  }

  entries.sort((a, b) => {
    const sectionDelta = (sectionIndex.get(a.sectionId) ?? 0) - (sectionIndex.get(b.sectionId) ?? 0);
    if (sectionDelta !== 0) return sectionDelta;
    const passageA = byId.get(a.passageId);
    const passageB = byId.get(b.passageId);
    const passageDelta = (passageA?.index ?? 0) - (passageB?.index ?? 0);
    if (passageDelta !== 0) return passageDelta;
    return a.annotation.ranges[0].start - b.annotation.ranges[0].start;
  });

  // entries is already section-ordered, so grouping consecutive runs is a
  // single pass — no second sort or bucket map needed.
  const groups: FeedSectionGroup[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last.sectionId === entry.sectionId) last.entries.push(entry);
    else groups.push({ sectionId: entry.sectionId, label: entry.label, entries: [entry] });
  }
  return groups;
}
