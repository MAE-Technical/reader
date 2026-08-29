import type { Passage, Section } from "@/lib/book/schema";

/** Flat lookup over a book's content tree (arbitrary depth — see
 * ingestion.md's "content-first, chapter-agnostic" design) so sections can
 * be resolved by stable id instead of array position. Shared by Reader
 * (the currently-viewed book) and the global narration engine (whichever
 * book is currently playing — not necessarily the same one). */
export function buildSectionsById(sections: Section[]): Map<string, Section> {
  const map = new Map<string, Section>();
  const walk = (secs: Section[]) => {
    for (const s of secs) {
      map.set(s.id, s);
      walk(s.children);
    }
  };
  walk(sections);
  return map;
}

/** Resolves a section id that might name a navigation label — a Part
 * grouping or an empty-passages duplicate TOC target (book-document.schema
 * v4: such sections carry passageCount: 0 in the manifest and are never
 * listed in `spine`) — to the nearest section actually reachable by the
 * reader: itself if it already has real content, otherwise the next
 * section *after* it, in the book's own depth-first document order, that
 * does. Returns null only if `id` isn't in the tree at all. Shared by every
 * "jump to this section id" entry point (chapters drawer, in-book link
 * marks) so a click on a Part header or duplicate TOC entry always lands
 * the reader somewhere instead of silently doing nothing. */
export function resolveSpineTarget(
  id: string,
  sections: Section[],
  spine: readonly string[]
): string | null {
  const spineSet = new Set(spine);
  const flatIds: string[] = [];
  const walk = (secs: Section[]) => {
    for (const s of secs) {
      flatIds.push(s.id);
      walk(s.children);
    }
  };
  walk(sections);
  const idx = flatIds.indexOf(id);
  if (idx === -1) return null;
  for (let i = idx; i < flatIds.length; i++) {
    if (spineSet.has(flatIds[i])) return flatIds[i];
  }
  return null;
}

/** Flat passage -> {passage, sectionId} lookup over the same content tree —
 * for contexts that only have a passageId (a saved highlight/note range) and
 * need the passage's own text plus which section/chapter cites it. */
export function buildPassageIndex(sections: Section[]): Map<string, { passage: Passage; sectionId: string }> {
  const map = new Map<string, { passage: Passage; sectionId: string }>();
  const walk = (secs: Section[]) => {
    for (const s of secs) {
      for (const p of s.passages) map.set(p.id, { passage: p, sectionId: s.id });
      walk(s.children);
    }
  };
  walk(sections);
  return map;
}
