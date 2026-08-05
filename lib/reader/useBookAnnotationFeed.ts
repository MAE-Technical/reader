import { useCallback, useMemo, useState } from "react";
import type { Passage, Section } from "@/lib/book/schema";
import { useAnnotations } from "./useAnnotations";
import { buildAnnotationFeedGroups, type FeedSectionGroup } from "./annotationFeed";

/** Which entries the panel actually renders — "all" is every highlight and
 * note thread alike, "notes" narrows down to entries with at least one note,
 * "highlights" is the complement (bare highlights only, nothing discussed
 * yet). Purely a display filter — totals below are always computed from the
 * full, unfiltered set, so the header badge/subtitle never appears to
 * shrink just because the reader narrowed their own view. */
export type AnnotationFeedFilter = "all" | "notes" | "highlights";

/**
 * Owns the book-wide annotation feed panel's own state — open/closed, the
 * section-grouped view-model, and which of the three the reader currently
 * has selected. Defaults to "notes" — the feed's whole point is surfacing
 * discourse worth re-reading, and a heavily-highlighted book would otherwise
 * bury that under every bare highlight on first open. Which highlight's
 * thread is doing what (composer/menu/edit) is each FeedHighlightThread's
 * own concern via useThreadInteraction, not centralized here — there's no
 * single "active" entry for this panel anymore (see the section-grouped
 * redesign).
 */
export function useBookAnnotationFeed({
  materialId,
  orderedSections,
  passageLookup,
}: {
  materialId: string;
  orderedSections: Section[];
  passageLookup: { byId: Map<string, Passage>; sectionOf: Map<string, string> };
}) {
  const { allAnnotations } = useAnnotations(materialId);

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<AnnotationFeedFilter>("notes");

  const groups: FeedSectionGroup[] = useMemo(
    () => buildAnnotationFeedGroups(allAnnotations, orderedSections, passageLookup.sectionOf, passageLookup.byId),
    [allAnnotations, orderedSections, passageLookup]
  );

  const visibleGroups: FeedSectionGroup[] = useMemo(() => {
    if (filter === "all") return groups;
    const keep = (e: FeedSectionGroup["entries"][number]) =>
      filter === "notes" ? e.annotation.notes.length > 0 : e.annotation.notes.length === 0;
    return groups.map((g) => ({ ...g, entries: g.entries.filter(keep) })).filter((g) => g.entries.length > 0);
  }, [groups, filter]);

  const totalNoteCount = groups.reduce(
    (sum, g) => sum + g.entries.reduce((s, e) => s + e.annotation.notes.length, 0),
    0
  );
  const passageCount = groups.reduce((sum, g) => sum + g.entries.length, 0);

  const openFeed = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  return { open, groups: visibleGroups, filter, setFilter, totalNoteCount, passageCount, openFeed, close };
}
