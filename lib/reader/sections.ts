import type { Section } from "@/lib/book/schema";

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
