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
